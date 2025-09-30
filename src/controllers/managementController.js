const Doctor = require("../models/Doctor");
const Staff = require("../models/Staff");
const DoctorSchedule = require("../models/DoctorSchedule");
const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const EquipmentIssue = require("../models/EquipmentIssue");
const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");

const parseTimeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isFulltimeShift = (startTime, endTime) => {
  return startTime === "07:00" && endTime === "17:00";
};

const isFourHourShift = (startTime, endTime) => {
  return parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime) === 240;
};

const hasRequiredLunchBreak = (startTime, endTime) => {
  // Require break 11:00-13:00 to be inside the shift window for fulltime
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  const breakStart = parseTimeToMinutes("11:00");
  const breakEnd = parseTimeToMinutes("13:00");
  return s <= breakStart && e >= breakEnd;
};

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
};

// ==================== BUSINESS VALIDATIONS ====================

// Check daily composition: 1 ngày cần 2 full + 2 part
const checkDoctorDailyComposition = async (locationId, date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const daySchedules = await DoctorSchedule.find({
    location: locationId,
    date: { $gte: targetDate, $lt: nextDay },
    isAvailable: true
  });

  const byDoctor = new Map();
  daySchedules.forEach(s => {
    if (!byDoctor.has(String(s.doctor))) byDoctor.set(String(s.doctor), []);
    byDoctor.get(String(s.doctor)).push(s);
  });

  const distinctDoctors = byDoctor.size;

  let fulltimeDoctors = 0;
  let parttimeDoctors = 0;

  for (const [doctorId, schedules] of byDoctor.entries()) {
    const hasFulltime = schedules.some(s => isFulltimeShift(s.startTime, s.endTime) && hasRequiredLunchBreak(s.startTime, s.endTime));
    const hasParttime = schedules.some(s => isFourHourShift(s.startTime, s.endTime));
    
    if (hasFulltime) fulltimeDoctors++;
    if (hasParttime) parttimeDoctors++;
  }

  const warnings = [];
  const errors = [];
  
  // Check if we have enough doctors for the day
  if (distinctDoctors < 4) {
    warnings.push(`Chưa đủ bác sĩ trong ngày (hiện tại: ${distinctDoctors}/4)`);
    // If not enough doctors, show warnings for missing full/part time
    if (fulltimeDoctors < 2) {
      warnings.push(`Cần thêm ${2 - fulltimeDoctors} bác sĩ fulltime trong ngày (hiện tại: ${fulltimeDoctors}/2)`);
    }
    if (parttimeDoctors < 2) {
      warnings.push(`Cần thêm ${2 - parttimeDoctors} bác sĩ part-time trong ngày (hiện tại: ${parttimeDoctors}/2)`);
    }
  } else if (distinctDoctors >= 4) {
    // Only enforce detailed requirements when we have enough doctors
    if (fulltimeDoctors < 2) {
      errors.push(`Cần tối thiểu 2 bác sĩ fulltime trong ngày (hiện tại: ${fulltimeDoctors}/2)`);
    }
    if (parttimeDoctors < 2) {
      errors.push(`Cần tối thiểu 2 bác sĩ part-time trong ngày (hiện tại: ${parttimeDoctors}/2)`);
    }
  }

  return { 
    isComplete: distinctDoctors >= 4, 
    isValid: errors.length === 0, 
    warnings, 
    errors,
    stats: {
      distinctDoctors,
      fulltimeDoctors,
      parttimeDoctors
    }
  };
};

// Check if weekly composition is complete (all requirements met)
const checkDoctorWeeklyCompositionComplete = async (locationId, date) => {
  const start = startOfWeek(date);
  const end = endOfWeek(date);

  const weekSchedules = await DoctorSchedule.find({
    location: locationId,
    date: { $gte: start, $lt: end },
    isAvailable: true
  });

  const byDoctor = new Map();
  weekSchedules.forEach(s => {
    if (!byDoctor.has(String(s.doctor))) byDoctor.set(String(s.doctor), []);
    byDoctor.get(String(s.doctor)).push(s);
  });

  const distinctDoctors = byDoctor.size;

  let fulltimeDoctorsMeeting6Days = 0; // 1 tuần 1 full làm 6 ngày
  let partTimersMeeting6Shifts = 0; // 1 tuần 1 part làm 6 ca 4 tiếng
  let fulltimeDoctorsWithMoreThan6Days = 0; // Bác sĩ fulltime làm nhiều hơn 6 ngày
  let partTimersWithMoreThan6Shifts = 0; // Bác sĩ part-time làm nhiều hơn 6 ca

  for (const [doctorId, schedules] of byDoctor.entries()) {
    // Check for fulltime doctor working 6 days (07:00-17:00 with lunch break)
    const fulltimeShifts = schedules.filter(s => 
      isFulltimeShift(s.startTime, s.endTime) && hasRequiredLunchBreak(s.startTime, s.endTime)
    );
    if (fulltimeShifts.length === 6) {
      fulltimeDoctorsMeeting6Days++;
    } else if (fulltimeShifts.length > 6) {
      fulltimeDoctorsWithMoreThan6Days++;
    }

    // Check for part-time doctor with 6 shifts of 4 hours each
    const fourHourShifts = schedules.filter(s => isFourHourShift(s.startTime, s.endTime));
    if (fourHourShifts.length === 6) {
      partTimersMeeting6Shifts++;
    } else if (fourHourShifts.length > 6) {
      partTimersWithMoreThan6Shifts++;
    }
  }

  const warnings = [];
  const errors = [];
  
  // Check if we have enough doctors
  if (distinctDoctors < 4) {
    warnings.push(`Chưa đủ bác sĩ trong tuần (hiện tại: ${distinctDoctors}/4)`);
    // If not enough doctors, show warnings for missing requirements
    if (fulltimeDoctorsMeeting6Days < 1) {
      warnings.push(`Cần ít nhất 1 bác sĩ fulltime làm đúng 6 ngày/tuần (07:00-17:00, nghỉ 11:00-13:00)`);
    }
    if (partTimersMeeting6Shifts < 1) {
      warnings.push(`Cần ít nhất 1 bác sĩ part-time làm đúng 6 ca/tuần (mỗi ca 4 tiếng)`);
    }
    // Show errors for excess even when not enough doctors
    if (fulltimeDoctorsWithMoreThan6Days > 0) {
      errors.push(`Có ${fulltimeDoctorsWithMoreThan6Days} bác sĩ fulltime làm nhiều hơn 6 ngày/tuần (chỉ được phép 1 bác sĩ làm 6 ngày)`);
    }
    if (partTimersWithMoreThan6Shifts > 0) {
      errors.push(`Có ${partTimersWithMoreThan6Shifts} bác sĩ part-time làm nhiều hơn 6 ca/tuần (chỉ được phép 1 bác sĩ làm 6 ca)`);
    }
  } else if (distinctDoctors >= 4) {
    // Only enforce detailed requirements when we have enough doctors
    if (fulltimeDoctorsMeeting6Days < 1) {
      errors.push("Cần tối thiểu 1 bác sĩ fulltime làm đúng 6 ngày/tuần (07:00-17:00, nghỉ 11:00-13:00)");
    }
    if (partTimersMeeting6Shifts < 1) {
      errors.push("Cần tối thiểu 1 bác sĩ part-time làm đúng 6 ca/tuần (mỗi ca 4 tiếng)");
    }
    // Show errors for excess
    if (fulltimeDoctorsWithMoreThan6Days > 0) {
      errors.push(`Có ${fulltimeDoctorsWithMoreThan6Days} bác sĩ fulltime làm nhiều hơn 6 ngày/tuần (chỉ được phép 1 bác sĩ làm 6 ngày)`);
    }
    if (partTimersWithMoreThan6Shifts > 0) {
      errors.push(`Có ${partTimersWithMoreThan6Shifts} bác sĩ part-time làm nhiều hơn 6 ca/tuần (chỉ được phép 1 bác sĩ làm 6 ca)`);
    }
  }

  return { 
    isComplete: distinctDoctors >= 4, 
    isValid: errors.length === 0, 
    warnings, 
    errors,
    stats: {
      distinctDoctors,
      fulltimeDoctorsMeeting6Days,
      partTimersMeeting6Shifts,
      fulltimeDoctorsWithMoreThan6Days,
      partTimersWithMoreThan6Shifts
    }
  };
};

// Legacy function for backward compatibility
const validateDoctorWeeklyComposition = async (locationId, date) => {
  const result = await checkDoctorWeeklyCompositionComplete(locationId, date);
  return { isValid: result.isValid, errors: result.errors };
};

// Enforce per-location weekly staff composition for receptionist and storeKepper: at least 1 fulltime each
// Options allow partial validation when creating schedules incrementally.
// When allowPartial is true and currentStaffType is 'receptionist', we don't block due to missing storeKepper yet.
const validateStaffWeeklyComposition = async (locationId, date, options = {}) => {
  const { allowPartial = false, currentStaffType } = options;
  const start = startOfWeek(date);
  const end = endOfWeek(date);

  const weekSchedules = await StaffSchedule.find({
    location: locationId,
    date: { $gte: start, $lt: end },
    isAvailable: true
  }).populate("staff", "staffType");

  let receptionistFulltime = false;
  let storeKepperFulltime = false;

  weekSchedules.forEach(s => {
    const type = s.staff?.staffType;
    if (isFulltimeShift(s.startTime, s.endTime) && hasRequiredLunchBreak(s.startTime, s.endTime)) {
      if (type === "receptionist") receptionistFulltime = true;
      if (type === "storeKepper") storeKepperFulltime = true;
    }
  });

  const errors = [];
  if (!receptionistFulltime) {
    errors.push("Cần tối thiểu 1 receptionist fulltime (07:00-17:00, nghỉ 11:00-13:00) trong tuần");
  }
  if (!storeKepperFulltime) {
    // Allow creating receptionist first without blocking on missing storeKepper
    const shouldSkipStoreKepperRequirement = allowPartial && currentStaffType === 'receptionist';
    if (!shouldSkipStoreKepperRequirement) {
      errors.push("Cần tối thiểu 1 storeKepper fulltime (07:00-17:00, nghỉ 11:00-13:00) trong tuần");
    }
  }

  return { isValid: errors.length === 0, errors };
};

// ==================== SCHEDULE CRUD WITH ENFORCEMENT ====================

const createDoctorSchedule = async (req, res) => {
  try {
    // Check if request body is an array (bulk create) or single object
    const schedulesData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    const errors = [];

    for (let i = 0; i < schedulesData.length; i++) {
      const { doctorId, locationId, date, startTime, endTime, notes } = schedulesData[i];

      try {
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          errors.push(`Lịch ${i + 1}: Không tìm thấy bác sĩ với ID ${doctorId}`);
          continue;
        }
        
        const location = await Location.findById(locationId);
        if (!location) {
          errors.push(`Lịch ${i + 1}: Không tìm thấy cơ sở với ID ${locationId}`);
          continue;
        }

        // Validate shift rules per shift
        const isFull = isFulltimeShift(startTime, endTime);
        if (isFull && !hasRequiredLunchBreak(startTime, endTime)) {
          errors.push(`Lịch ${i + 1}: Fulltime phải bao gồm nghỉ trưa 11:00-13:00`);
          continue;
        }
        if (!isFull && !isFourHourShift(startTime, endTime)) {
          errors.push(`Lịch ${i + 1}: Ca part-time phải là 4 tiếng`);
          continue;
        }

        // Create then check weekly composition including new shift
        console.log('Creating schedule with data:', {
          doctor: doctorId,
          location: locationId,
          date: new Date(date),
          startTime,
          endTime,
          notes,
          createdBy: req.management._id
        });

        const schedule = new DoctorSchedule({
          doctor: doctorId,
          location: locationId,
          date: new Date(date),
          startTime,
          endTime,
          isAvailable: true,
          notes,
          createdBy: req.management._id
        });

        console.log('Schedule object created:', schedule);
        
        try {
          await schedule.save();
          console.log('Schedule saved successfully with ID:', schedule._id);
        } catch (saveError) {
          console.error('Error saving schedule:', saveError);
          errors.push(`Lịch ${i + 1}: Lỗi lưu database - ${saveError.message}`);
          continue;
        }

        // Check daily and weekly composition for each schedule creation
        const dailyCheck = await checkDoctorDailyComposition(locationId, new Date(date));
        const weeklyCheck = await checkDoctorWeeklyCompositionComplete(locationId, new Date(date));
        
        // If we have enough doctors but violate constraints, rollback
        if (dailyCheck.isComplete && !dailyCheck.isValid) {
          await DoctorSchedule.findByIdAndDelete(schedule._id);
          errors.push(`Lịch ${i + 1}: Vi phạm ràng buộc bác sĩ trong ngày - ${dailyCheck.errors.join(', ')}`);
          continue;
        }
        
        if (weeklyCheck.isComplete && !weeklyCheck.isValid) {
          await DoctorSchedule.findByIdAndDelete(schedule._id);
          errors.push(`Lịch ${i + 1}: Vi phạm ràng buộc bác sĩ trong tuần - ${weeklyCheck.errors.join(', ')}`);
          continue;
        }
        
        // If not enough doctors, add warnings but don't rollback
        if (!dailyCheck.isComplete && dailyCheck.warnings.length > 0) {
          // Add warnings to the response but don't fail the creation
          // We'll handle this in the final response
        }
        
        if (!weeklyCheck.isComplete && weeklyCheck.warnings.length > 0) {
          // Add warnings to the response but don't fail the creation
          // We'll handle this in the final response
        }

        const populated = await DoctorSchedule.findById(schedule._id)
          .populate("doctor", "doctorId user")
          .populate("location", "name address")
          .populate({
            path: "createdBy",
            select: "user staffType",
            populate: {
              path: "user",
              select: "fullName email role"
            }
          });

        // Notify assigned doctor
        try {
          await Notification.create({
            sender: req.management?._id,
            recipients: [doctorId],
            recipientModel: "Doctor",
            title: "Lịch làm việc mới",
            message: `Bạn được xếp lịch ngày ${new Date(date).toLocaleDateString("vi-VN")} từ ${startTime} đến ${endTime} tại cơ sở ${location.name}`,
            type: "doctor_schedule_assigned",
            relatedData: {
              scheduleId: populated._id,
              scheduleType: "doctor",
              location: locationId,
              assignedPerson: doctorId,
              doctorId: doctorId
            }
          });
        } catch (notifyErr) {
          // Non-blocking
          console.error("Notify doctor create schedule error:", notifyErr);
        }

        results.push(populated);
      } catch (error) {
        errors.push(`Lịch ${i + 1}: ${error.message}`);
      }
    }

    // Check for warnings on successful schedule creation
    let warnings = [];
    if (results.length > 0 && errors.length === 0) {
      const firstSchedule = results[0];
      const dailyCheck = await checkDoctorDailyComposition(firstSchedule.location, new Date(firstSchedule.date));
      const weeklyCheck = await checkDoctorWeeklyCompositionComplete(firstSchedule.location, new Date(firstSchedule.date));
      
      if (!dailyCheck.isComplete) {
        warnings = warnings.concat(dailyCheck.warnings);
      }
      if (!weeklyCheck.isComplete) {
        warnings = warnings.concat(weeklyCheck.warnings);
      }
    }

    // If there are errors, return them
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Có ${errors.length} lỗi trong quá trình tạo lịch`, 
        errors,
        successful: results.length,
        failed: errors.length
      });
    }


    // If all successful
    const message = results.length === 1 
      ? "Tạo lịch bác sĩ thành công" 
      : `Tạo thành công ${results.length} lịch bác sĩ`;

    const response = { 
      success: true, 
      message, 
      data: results.length === 1 ? results[0] : results,
      count: results.length
    };

    // Add warnings if any
    if (warnings.length > 0) {
      response.warnings = warnings;
      response.message += ` (Có ${warnings.length} cảnh báo)`;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi tạo lịch bác sĩ", error: error.message });
  }
};

const updateDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, notes } = req.body;
    const schedule = await DoctorSchedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });

    const newDate = date ? new Date(date) : schedule.date;
    const newStart = startTime || schedule.startTime;
    const newEnd = endTime || schedule.endTime;

    const isFull = isFulltimeShift(newStart, newEnd);
    if (isFull && !hasRequiredLunchBreak(newStart, newEnd)) {
      return res.status(400).json({ success: false, message: "Fulltime phải bao gồm nghỉ trưa 11:00-13:00" });
    }
    if (!isFull && !isFourHourShift(newStart, newEnd)) {
      return res.status(400).json({ success: false, message: "Ca part-time phải là 4 tiếng" });
    }

    schedule.date = newDate;
    schedule.startTime = newStart;
    schedule.endTime = newEnd;
    if (notes !== undefined) schedule.notes = notes;
    await schedule.save();

    const weekly = await validateDoctorWeeklyComposition(schedule.location, newDate);
    if (!weekly.isValid) {
      return res.status(400).json({ success: false, message: "Vi phạm ràng buộc bác sĩ trong tuần", errors: weekly.errors });
    }

    const populated = await DoctorSchedule.findById(schedule._id)
      .populate("doctor", "doctorId user")
      .populate("location", "name address")
          .populate({
            path: "createdBy",
            select: "user staffType",
            populate: {
              path: "user",
              select: "fullName email role"
            }
          });

    // Notify doctor about update
    try {
      await Notification.create({
        sender: req.management?._id,
        recipients: [schedule.doctor],
        recipientModel: "Doctor",
        title: "Cập nhật lịch làm việc",
        message: `Lịch ngày ${new Date(newDate).toLocaleDateString("vi-VN")} đã được cập nhật: ${newStart} - ${newEnd}`,
        type: "schedule_update",
        relatedData: {
          scheduleId: populated._id,
          scheduleType: "doctor",
          location: schedule.location,
          assignedPerson: schedule.doctor,
          doctorId: schedule.doctor
        }
      });
    } catch (notifyErr) {
      console.error("Notify doctor update schedule error:", notifyErr);
    }

    res.status(200).json({ success: true, message: "Cập nhật lịch bác sĩ thành công", data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật lịch bác sĩ", error: error.message });
  }
};

const deleteDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await DoctorSchedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });

    const locationId = schedule.location;
    const date = schedule.date;
    await schedule.deleteOne();

    const weekly = await validateDoctorWeeklyComposition(locationId, date);
    if (!weekly.isValid) {
      return res.status(400).njson({ success: false, message: "Xóa lịch làm vi phạm ràng buộc bác sĩ trong tuần", errors: weekly.errors });
    }

    // Notify doctor about deletion
    try {
      await Notification.create({
        sender: req.management?._id,
        recipients: [schedule.doctor],
        recipientModel: "Doctor",
        title: "Hủy lịch làm việc",
        message: `Lịch ngày ${new Date(date).toLocaleDateString("vi-VN")} (${schedule.startTime} - ${schedule.endTime}) đã bị hủy`,
        type: "schedule_update",
        relatedData: {
          scheduleType: "doctor",
          location: locationId,
          assignedPerson: schedule.doctor,
          doctorId: schedule.doctor
        }
      });
    } catch (notifyErr) {
      console.error("Notify doctor delete schedule error:", notifyErr);
    }

    res.status(200).json({ success: true, message: "Xóa lịch bác sĩ thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xóa lịch bác sĩ", error: error.message });
  }
};

const createStaffSchedule = async (req, res) => {
  try {
    // Hỗ trợ tạo 1 hoặc nhiều lịch trong 1 request
    const schedulesData = Array.isArray(req.body) ? req.body : [req.body];

    const results = [];
    const errors = [];

    for (let i = 0; i < schedulesData.length; i++) {
      const { staffId, locationId, date, startTime, endTime, notes } = schedulesData[i] || {};

      try {
        const staff = await Staff.findById(staffId);
        if (!staff) {
          errors.push(`Lịch ${i + 1}: Không tìm thấy nhân viên với ID ${staffId}`);
          continue;
        }

        const location = await Location.findById(locationId);
        if (!location) {
          errors.push(`Lịch ${i + 1}: Không tìm thấy cơ sở với ID ${locationId}`);
          continue;
        }

        // Chỉ cho xếp lịch cho receptionist hoặc storeKepper
        if (!['receptionist', 'storeKepper'].includes(staff.staffType)) {
          errors.push(`Lịch ${i + 1}: Chỉ xếp lịch cho receptionist hoặc storeKepper (nhân viên hiện tại: ${staff.staffType || 'không xác định'})`);
          continue;
        }

        // Staff fulltime phải là 07:00-17:00 và có nghỉ trưa 11:00-13:00
        if (!isFulltimeShift(startTime, endTime) || !hasRequiredLunchBreak(startTime, endTime)) {
          errors.push(`Lịch ${i + 1}: Staff phải làm fulltime 07:00-17:00 (nghỉ 11:00-13:00)`);
          continue;
        }

        const schedule = new StaffSchedule({
          staff: staff._id,
          location: locationId,
          date: new Date(date),
          startTime,
          endTime,
          isAvailable: true,
          notes,
          createdBy: req.management._id
        });

        try {
          await schedule.save();
        } catch (saveError) {
          errors.push(`Lịch ${i + 1}: Lỗi lưu database - ${saveError.message}`);
          continue;
        }

        // Kiểm tra ràng buộc tuần cho staff (ít nhất 1 receptionist fulltime và 1 storeKepper fulltime)
        const weekly = await validateStaffWeeklyComposition(
          locationId,
          new Date(date),
          { allowPartial: true, currentStaffType: staff.staffType }
        );
        if (!weekly.isValid) {
          await StaffSchedule.findByIdAndDelete(schedule._id);
          errors.push(`Lịch ${i + 1}: Vi phạm ràng buộc staff trong tuần - ${weekly.errors.join(', ')}`);
          continue;
        }

        const populated = await StaffSchedule.findById(schedule._id)
          .populate("staff", "staffType user")
          .populate("location", "name address");

        // Notify assigned staff
        try {
          await Notification.create({
            sender: req.management?._id,
            recipients: [staff._id],
            recipientModel: "Staff",
            title: "Lịch làm việc mới",
            message: `Bạn được xếp lịch ngày ${new Date(date).toLocaleDateString("vi-VN")} từ ${startTime} đến ${endTime} tại cơ sở ${location.name}`,
            type: "staff_schedule_assigned",
            relatedData: {
              staffScheduleId: populated._id,
              scheduleType: "staff",
              location: locationId,
              assignedPerson: staff._id
            }
          });
        } catch (notifyErr) {
          console.error("Notify staff create schedule error:", notifyErr);
        }

        results.push(populated);
      } catch (innerError) {
        errors.push(`Lịch ${i + 1}: ${innerError.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Có ${errors.length} lỗi trong quá trình tạo lịch staff`,
        errors,
        successful: results.length,
        failed: errors.length
      });
    }

    const message = results.length === 1
      ? "Tạo lịch staff thành công"
      : `Tạo thành công ${results.length} lịch staff`;

    return res.status(201).json({ success: true, message, data: results.length === 1 ? results[0] : results, count: results.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi tạo lịch staff", error: error.message });
  }
};

const updateStaffSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, notes } = req.body;
    const schedule = await StaffSchedule.findById(scheduleId).populate("staff", "staffType");
    if (!schedule) return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });

    const newDate = date ? new Date(date) : schedule.date;
    const newStart = startTime || schedule.startTime;
    const newEnd = endTime || schedule.endTime;

    if (!isFulltimeShift(newStart, newEnd) || !hasRequiredLunchBreak(newStart, newEnd)) {
      return res.status(400).json({ success: false, message: "Staff phải làm fulltime 07:00-17:00 (nghỉ 11:00-13:00)" });
    }

    schedule.date = newDate;
    schedule.startTime = newStart;
    schedule.endTime = newEnd;
    if (notes !== undefined) schedule.notes = notes;
    await schedule.save();

    const weekly = await validateStaffWeeklyComposition(schedule.location, newDate);
    if (!weekly.isValid) {
      return res.status(400).json({ success: false, message: "Vi phạm ràng buộc staff trong tuần", errors: weekly.errors });
    }

    const populated = await StaffSchedule.findById(schedule._id)
      .populate("staff", "staffType user")
      .populate("location", "name address");

    // Notify staff about update
    try {
      await Notification.create({
        sender: req.management?._id,
        recipients: [schedule.staff],
        recipientModel: "Staff",
        title: "Cập nhật lịch làm việc",
        message: `Lịch ngày ${new Date(newDate).toLocaleDateString("vi-VN")} đã được cập nhật: ${newStart} - ${newEnd}`,
        type: "schedule_update",
        relatedData: {
          staffScheduleId: populated._id,
          scheduleType: "staff",
          location: schedule.location,
          assignedPerson: schedule.staff
        }
      });
    } catch (notifyErr) {
      console.error("Notify staff update schedule error:", notifyErr);
    }

    res.status(200).json({ success: true, message: "Cập nhật lịch staff thành công", data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi cập nhật lịch staff", error: error.message });
  }
};

const deleteStaffSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await StaffSchedule.findById(scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });

    const locationId = schedule.location;
    const date = schedule.date;
    const staffId = schedule.staff;
    const start = schedule.startTime;
    const end = schedule.endTime;
    await schedule.deleteOne();

    const weekly = await validateStaffWeeklyComposition(locationId, date);
    if (!weekly.isValid) {
      return res.status(400).json({ success: false, message: "Xóa lịch làm vi phạm ràng buộc staff trong tuần", errors: weekly.errors });
    }

    // Notify staff about deletion
    try {
      await Notification.create({
        sender: req.management?._id,
        recipients: [staffId],
        recipientModel: "Staff",
        title: "Hủy lịch làm việc",
        message: `Lịch ngày ${new Date(date).toLocaleDateString("vi-VN")} (${start} - ${end}) đã bị hủy`,
        type: "schedule_update",
        relatedData: {
          scheduleType: "staff",
          location: locationId,
          assignedPerson: staffId
        }
      });
    } catch (notifyErr) {
      console.error("Notify staff delete schedule error:", notifyErr);
    }

    res.status(200).json({ success: true, message: "Xóa lịch staff thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xóa lịch staff", error: error.message });
  }
};

// ==================== PROFILES ====================
const getDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy hồ sơ bác sĩ", error: error.message });
  }
};

const getStaffProfile = async (req, res) => {
  try {
    const { staffId } = req.params;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy hồ sơ nhân viên", error: error.message });
  }
};

// ==================== EQUIPMENT ISSUES (VIEW) ====================
const getAllEquipmentIssues = async (req, res) => {
  try {
    const { status, severity } = req.query;
    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    const issues = await EquipmentIssue.find(query).populate('equipment', 'name category status').populate('reporter', 'user');
    res.status(200).json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách sự cố", error: error.message });
  }
};

// ==================== REVENUE ====================
const getRevenue = async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period === 'month') {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      const now = new Date();
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      start = startOfWeek(new Date());
      end = endOfWeek(new Date());
    }

    const revenueAgg = await Invoice.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }
    ]);

    res.status(200).json({ success: true, data: { period: { start, end }, total: revenueAgg[0]?.total || 0, invoices: revenueAgg[0]?.count || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi thống kê doanh thu", error: error.message });
  }
};

module.exports = {
  createDoctorSchedule,
  updateDoctorSchedule,
  deleteDoctorSchedule,
  createStaffSchedule,
  // Explicit helpers for each staff type
  createReceptionistSchedule: async (req, res) => {
    try {
      // Hỗ trợ cả single và bulk
      const payload = Array.isArray(req.body) ? req.body : [req.body];

      // Xác thực tất cả staffId đều là receptionist
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i];
        const staff = await Staff.findById(item.staffId);
        if (!staff) {
          return res.status(400).json({ success: false, message: `Lịch ${i + 1}: Không tìm thấy nhân viên với ID ${item.staffId}` });
        }
        if (staff.staffType !== 'receptionist') {
          return res.status(400).json({ success: false, message: `Lịch ${i + 1}: staffId phải là receptionist` });
        }
      }

      // Ủy quyền xử lý cho createStaffSchedule (đã hỗ trợ bulk)
      return createStaffSchedule(req, res);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi tạo lịch receptionist", error: error.message });
    }
  },
  createStoreKepperSchedule: async (req, res) => {
    try {
      // Hỗ trợ cả single và bulk
      const payload = Array.isArray(req.body) ? req.body : [req.body];

      // Xác thực tất cả staffId đều là receptionist
      for (let i = 0; i < payload.length; i++) {
        const item = payload[i];
        const staff = await Staff.findById(item.staffId);
        if (!staff) {
          return res.status(400).json({ success: false, message: `Lịch ${i + 1}: Không tìm thấy nhân viên với ID ${item.staffId}` });
        }
        if (staff.staffType !== 'storeKepper') {
          return res.status(400).json({ success: false, message: `Lịch ${i + 1}: staffId phải là receptionist` });
        }
      }

      // Ủy quyền xử lý cho createStaffSchedule (đã hỗ trợ bulk)
      return createStaffSchedule(req, res);
    } catch (error) {
      res.status(500).json({ success: false, message: "Lỗi tạo lịch StoreKepper", error: error.message });
    }
  },
  updateStaffSchedule,
  deleteStaffSchedule,
  getDoctorProfile,
  getStaffProfile,
  getAllEquipmentIssues,
  getRevenue
};


