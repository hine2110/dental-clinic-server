const Doctor = require("../models/Doctor");
const Staff = require("../models/Staff");
const DoctorSchedule = require("../models/DoctorSchedule");
const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const EquipmentIssue = require("../models/EquipmentIssue");
const Invoice = require("../models/Invoice");
const Notification = require("../models/Notification");
const Patient = require("../models/Patient");
const User = require("../models/User");


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
  // Require break 12:00-13:00 to be inside the shift window for fulltime
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  const breakStart = parseTimeToMinutes("12:00");
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
const getManagerProfile = async (req, res) => {
  try {
    // req.user.id được cung cấp bởi middleware 'authenticate'
    // Đây chính là _id của User
    const managerUser = await User.findById(req.user.id)
                                  .select("-password -googleId"); // Loại bỏ các trường nhạy cảm

    if (!managerUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ người dùng." });
    }

    res.status(200).json({ success: true, data: managerUser });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy hồ sơ quản lý.",
      error: error.message
    });
  }
};

const updateManagerProfile = async (req, res) => {
  try {
    const { phone } = req.body;
    const updateData = {};

    // 1. Chỉ cập nhật 'phone' nếu nó được gửi lên
    if (phone !== undefined) {
      updateData.phone = phone;
    }

    // 2. Xử lý 'avatar' nếu có tệp được tải lên
    // req.file được cung cấp bởi middleware 'upload'
    if (req.file) {
      // Lưu đường dẫn tương đối để client có thể truy cập
      // Dựa trên 'upload.js', file được lưu trong 'uploads'
      updateData.avatar = `uploads/${req.file.filename}`;
    }

    // 3. Tìm và cập nhật người dùng
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, // ID từ middleware 'authenticate'
      { $set: updateData },
      { new: true, runValidators: true, select: "-password -googleId" } 
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng để cập nhật." });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công!",
      data: updatedUser // Trả về dữ liệu người dùng đã cập nhật
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật hồ sơ.",
      error: error.message
    });
  }
};
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

        const utcDate = new Date(date);

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
          date: utcDate,
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
            message: `Bạn được xếp lịch ngày ${utcDate.toLocaleDateString("vi-VN")} từ ${startTime} đến ${endTime} tại cơ sở ${location.name}`,
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
      const dailyCheck = await checkDoctorDailyComposition(firstSchedule.location, firstSchedule.date);
      const weeklyCheck = await checkDoctorWeeklyCompositionComplete(firstSchedule.location, firstSchedule.date);
      
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

    const newDate = date ? new Date(`${date}T00:00:00.000Z`): schedule.date;
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

    // --- BƯỚC 1: Lưu lại TẤT CẢ thông tin của lịch sắp xóa ---
    const { doctor, location, date, startTime, endTime, notes, createdBy } = schedule;

    // --- BƯỚC 2: Thực hiện xóa ---
    await schedule.deleteOne();

    // --- BƯỚC 3: Kiểm tra tính hợp lệ SAU KHI XÓA ---
    const weekly = await validateDoctorWeeklyComposition(location, date);
    
    if (!weekly.isValid) {
      // --- BƯỚC 4: ROLLBACK (Tạo lại lịch đã xóa) ---
      // Nếu việc xóa vi phạm ràng buộc, tạo lại lịch y hệt
      try {
        const rollbackSchedule = new DoctorSchedule({
          doctor: doctor,
          location: location,
          date: date,
          startTime: startTime,
          endTime: endTime,
          isAvailable: true, // Giả sử lịch bị xóa là 'isAvailable'
          notes: notes,
          createdBy: createdBy
        });
        await rollbackSchedule.save();
      } catch (rollbackError) {
        // Nếu rollback thất bại thì đây là lỗi 500 nghiêm trọng
        return res.status(500).json({ 
          success: false, 
          message: "Lỗi nghiêm trọng: Xóa lịch gây vi phạm và không thể hoàn tác. Vui lòng tải lại trang.", 
          error: rollbackError.message 
        });
      }

      // --- SỬA LỖI TYPO VÀ TRẢ VỀ LỖI 400 ---
      // Giờ mới trả về lỗi cho người dùng, sau khi đã rollback an toàn
      return res.status(400).json({ // <-- Sửa .njson thành .json
        success: false, 
        message: "Xóa lịch làm vi phạm ràng buộc bác sĩ trong tuần", 
        errors: weekly.errors 
      });
    }

    // --- BƯỚC 5: Gửi thông báo (chỉ khi xóa thành công và hợp lệ) ---
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
          location: location, // Sửa từ locationId
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
    const schedulesData = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    const errors = [];

    for (let i = 0; i < schedulesData.length; i++) {
      const { staffId, locationId, date, startTime, endTime, notes } = schedulesData[i] || {};

      try {
        // --- VALIDATION ĐẦU VÀO ---
        if (!staffId || !locationId || !date || !startTime || !endTime) {
            errors.push(`Lịch ${i + 1}: Thiếu thông tin bắt buộc (nhân viên, cơ sở, ngày, giờ).`);
            continue;
        }

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
        
  
        if (!['receptionist', 'storeKepper'].includes(staff.staffType)) {
          errors.push(`Lịch ${i + 1}: Chỉ xếp lịch cho receptionist hoặc storeKepper.`);
          continue;
        }
        const isFull = isFulltimeShift(startTime, endTime);
        if (isFull && !hasRequiredLunchBreak(startTime, endTime)) {
          errors.push(`Lịch ${i + 1}: Ca fulltime phải bao gồm nghỉ trưa 11:00-13:00`);
          continue;
        }
        if (!isFull && !isFourHourShift(startTime, endTime)) {
          errors.push(`Lịch ${i + 1}: Ca part-time phải là 4 tiếng`);
          continue;
        }

        // FIX: SỬA LỖI MÚI GIỜ KHI TẠO NGÀY
        const utcDate = new Date(`${date}T00:00:00.000Z`);

        const conflictQuery = {
          staff: staffId,
          date: utcDate,
          // Điều kiện để tìm ra bất kỳ lịch nào có thời gian chồng chéo
          startTime: { $lt: endTime }, // Bắt đầu của lịch cũ < Kết thúc của lịch mới
          endTime: { $gt: startTime }   // Kết thúc của lịch cũ > Bắt đầu của lịch mới
        };

        const conflictingSchedule = await StaffSchedule.findOne(conflictQuery);

        if (conflictingSchedule) {
          errors.push(`Lịch ${i + 1}: Xung đột lịch! Nhân viên đã có lịch từ ${conflictingSchedule.startTime} đến ${conflictingSchedule.endTime} trong ngày này.`);
          continue; // Bỏ qua và xử lý lịch tiếp theo
        }
        
        const schedule = new StaffSchedule({
          staff: staff._id,
          location: locationId,
          date: utcDate, // <-- SỬ DỤNG NGÀY UTC
          startTime,
          endTime,
          isAvailable: true,
          notes,
          createdBy: req.management._id
        });

        await schedule.save();

        // Kiểm tra ràng buộc tuần cho staff (ít nhất 1 receptionist fulltime và 1 storeKepper fulltime)
        // Chỉ kiểm tra nếu đây là ca fulltime, part-time không cần kiểm tra ràng buộc tuần
        if (isFull) {
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
        }

        const populated = await StaffSchedule.findById(schedule._id)
          .populate({
            path: 'staff',
            populate: { path: 'user', select: 'fullName' }
          })
          
        results.push(populated);
        

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
    console.error('Error in createStaffSchedule:', error);
    return res.status(500).json({ success: false, message: "Lỗi tạo lịch staff", error: error.message });
  }
};

const updateStaffSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, notes } = req.body;
    const schedule = await StaffSchedule.findById(scheduleId).populate("staff", "staffType");
    if (!schedule) return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });

    const newDate = date ? new Date(`${date}T00:00:00.000Z`): schedule.date;
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

    // Chỉ kiểm tra ràng buộc tuần nếu đây là ca fulltime
    const isFull = isFulltimeShift(newStart, newEnd);
    if (isFull) {
      const weekly = await validateStaffWeeklyComposition(schedule.location, newDate);
      if (!weekly.isValid) {
        return res.status(400).json({ success: false, message: "Vi phạm ràng buộc staff trong tuần", errors: weekly.errors });
      }
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
    
    // 1. Tìm lịch
    const schedule = await StaffSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch" });
    }

    // 2. Lấy thông tin cần thiết cho notification (TRƯỚC KHI XÓA)
    const locationId = schedule.location;
    const date = schedule.date;
    const staffId = schedule.staff;
    const start = schedule.startTime;
    const end = schedule.endTime;

    // 3. Thực hiện xóa
    await schedule.deleteOne();


    // 6. Trả về thành công
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
    const issues = await EquipmentIssue.find(query)
    .populate('equipment', 'name model serialNumber')
    .populate({ // Lấy thông tin người báo cáo
      path: 'reporter', 
      select: 'user staffType', // Thêm staffType nếu cần
      populate: { path: 'user', select: 'fullName' } 
    })
    .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi lấy danh sách sự cố", error: error.message });
  }
};

const updateEquipmentIssueStatus = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;
    
    // Lấy các status hợp lệ từ Enum của Model
    const allowedStatuses = EquipmentIssue.schema.path('status').enumValues;
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${allowedStatuses.join(', ')}` });
    }

    // Cập nhật và lấy lại document mới nhất, populate lại
    const updatedIssue = await EquipmentIssue.findByIdAndUpdate(
      issueId,
      { status: status },
      { new: true, runValidators: true } // runValidators để đảm bảo status hợp lệ
    ).populate('equipment', 'name')
     .populate({ 
        path: 'reporter', 
        select: 'user', 
        populate: { path: 'user', select: 'fullName' } 
      })
    

    if (!updatedIssue) {
      return res.status(404).json({ success: false, message: "Không tìm thấy báo cáo sự cố." });
    }

    // (Tùy chọn) Gửi thông báo cho Store Keeper biết trạng thái đã thay đổi
    try {
      if (updatedIssue.reporter) { // Kiểm tra reporter có tồn tại không
          await Notification.create({
              sender: req.management?._id, // ID của manager
              recipients: [updatedIssue.reporter._id], // ID của staff đã báo cáo
              recipientModel: "Staff",
              title: "Cập nhật trạng thái sự cố thiết bị",
              message: `Sự cố bạn báo cáo cho thiết bị "${updatedIssue.equipment?.name || 'N/A'}" đã được chuyển sang trạng thái "${status}".`,
              type: "equipment_issue_update",
              relatedData: {
                  equipmentIssueId: updatedIssue._id,
                  newStatus: status
              }
          });
      }
    } catch (notifyErr) {
        console.error("Lỗi gửi thông báo cập nhật sự cố:", notifyErr);
        // Không chặn luồng chính nếu gửi thông báo lỗi
    }


    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công!",
      data: updatedIssue
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái sự cố.",
      error: error.message
    });
  }
};

// ==================== REVENUE ====================


const getRevenueStatistics = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate, paymentMethod, q } = req.query;

    let query = { status: "PAID" };

    if (startDate && endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.invoiceDate = { 
        $gte: new Date(startDate), 
        $lte: endOfDay 
      };
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (q) {
      const patients = await Patient.find({ 'basicInfo.fullName': { $regex: q, $options: 'i' } }).select('_id');
      const patientIds = patients.map(p => p._id);

      query.$or = [
        { invoiceId: { $regex: q, $options: 'i' } },
        { patient: { $in: patientIds } }
      ];
    }

    const [
      invoices, 
      totalInvoices,
      revenueResult
    ] = await Promise.all([
      Invoice.find(query)
        .populate({ 
          path: 'patient',
          select: 'basicInfo.fullName'
        })
        .populate({
          path: 'staff',
          select: 'user',
          populate: { path: 'user', select: 'fullName' }
        })
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(query),
      Invoice.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: "$finalAmount" } 
          } 
        }
      ])
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    const totalPages = Math.ceil(totalInvoices / limit);

    res.status(200).json({
      success: true,
      message: "Lấy lịch sử hóa đơn thành công",
      data: invoices,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalInvoices: totalInvoices
      },
      summary: {
        totalRevenue: totalRevenue
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử hóa đơn",
      error: error.message
    });
  }
};
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

const getRevenueChartData = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Thiếu startDate hoặc endDate" });
    }

    let dateFormat;
    switch (groupBy) {
      case 'month':
        dateFormat = '%Y-%m'; // Nhóm theo Năm-Tháng
        break;
      case 'year':
        dateFormat = '%Y'; // Nhóm theo Năm
        break;
      default: // 'day'
        dateFormat = '%Y-%m-%d'; // Nhóm theo Năm-Tháng-Ngày
        break;
    }

    const aggregation = [
      {
        // 1. Lọc các hóa đơn đã thanh toán trong khoảng ngày
        $match: {
          status: "PAID",
          invoiceDate: {
            $gte: new Date(startDate),
            // Lấy đến cuối ngày endDate
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
          }
        }
      },
      {
        // 2. Nhóm theo ngày (hoặc tháng/năm)
        $group: {
          _id: {
            $dateToString: { 
              format: dateFormat, 
              date: "$invoiceDate",
              timezone: "+07:00" // <-- Quan trọng: Đặt múi giờ VN
            }
          },
          totalRevenue: { $sum: "$finalAmount" }
        }
      },
      {
        // 3. Sắp xếp theo ngày tăng dần
        $sort: { _id: 1 }
      },
      {
        // 4. Định dạng lại output cho gọn
        $project: {
          _id: 0,
          date: "$_id", // đổi tên _id thành 'date'
          revenue: "$totalRevenue" // đổi tên totalRevenue thành 'revenue'
        }
      }
    ];

    const chartData = await Invoice.aggregate(aggregation);

    res.status(200).json({ success: true, data: chartData });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi lấy dữ liệu biểu đồ", 
      error: error.message 
    });
  }
};

// Get all doctor schedules
const getDoctorSchedules = async (req, res) => {
  try {
    const { startDate, endDate, locationId } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      // FIX 1: Ép ngày thành UTC để tránh lỗi múi giờ
      query.date = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`) // Lấy đến cuối ngày
      };
    }
    
    if (locationId) {
      query.location = locationId;
    }

    const schedules = await DoctorSchedule.find(query)
      // FIX 2: Gộp hai lần populate 'doctor' thành một cho gọn
      .populate({
        path: 'doctor',
        select: 'doctorId user specializations', // Thêm select ở đây
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .populate('location', 'name address')
      .populate({
        path: 'createdBy',
        select: 'user staffType',
        populate: {
          path: 'user',
          select: 'fullName email role'
        }
      })
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch bác sĩ thành công",
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch bác sĩ",
      error: error.message
    });
  }
};

// Get all staff schedules
const getStaffSchedules = async (req, res) => {
  try {
    const { startDate, endDate, locationId, staffType } = req.query;
    
    let query = {};
    
    // Xử lý múi giờ chính xác
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`)
      };
    }
    
    if (locationId) {
      query.location = locationId;
    }

    // Nếu có staffType, chúng ta sẽ lọc trong 2 bước (an toàn và dễ hiểu hơn)
    if (staffType) {
      // Bước 1: Tìm tất cả staff IDs có staffType tương ứng
      const staffIds = await Staff.find({ staffType: staffType }).select('_id');
      // Bước 2: Dùng các IDs đó để lọc trong bảng schedule
      query.staff = { $in: staffIds.map(s => s._id) };
    }

    const schedules = await StaffSchedule.find(query)
      .populate({
        path: 'staff',
        select: 'staffType user', // Chọn các trường cần thiết
        populate: {
          path: 'user',
          select: 'fullName email phone' // Lấy thông tin user
        }
      })
      .populate('location', 'name address')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch nhân viên thành công",
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    // Thêm console.log để dễ dàng xem lỗi trên terminal của server
    console.error("CRASH IN getStaffSchedules:", error); 
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch nhân viên",
      error: error.message
    });
  }
};

// Get all doctors
const getAllDoctors = async (req, res) => {
  try {
    console.log('getAllDoctors called');
    const doctors = await Doctor.find()
      .populate('user', 'fullName email phone isActive') // <-- SỬA Ở ĐÂY: Thêm 'isActive'
      .select('doctorId user specializations') // <-- SỬA Ở ĐÂY: Bỏ 'isActive'
      .sort({ 'user.fullName': 1 });

    console.log('Found doctors:', doctors.length);
    console.log('Doctors data:', doctors);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bác sĩ thành công",
      data: doctors,
      count: doctors.length
    });
  } catch (error) {
    console.error('Error in getAllDoctors:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bác sĩ",
      error: error.message
    });
  }
};

const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find()
      .populate('user', 'fullName email phone isActive') // <-- SỬA Ở ĐÂY: Thêm 'isActive' vào populate
      .select('staffId user staffType') // <-- SỬA Ở ĐÂY: Bỏ 'isActive' khỏi select
      .sort({ 'user.fullName': 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nhân viên thành công",
      data: staff,
      count: staff.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách nhân viên",
      error: error.message
    });
  }
};

// Get all locations
const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find()
      .select('name address phone isActive')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách cơ sở thành công",
      data: locations,
      count: locations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách cơ sở",
      error: error.message
    });
  }
};

const getLocationById = async (req, res) => {
  try {
    const { locationId } = req.params;
    const location = await Location.findById(locationId);

    if (!location) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cơ sở." });
    }

    res.status(200).json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin cơ sở.",
      error: error.message
    });
  }
};

const createLocation = async (req, res) => {
  try {
    const newLocation = new Location({
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      email: req.body.email,
      isActive: req.body.isActive
    });

    await newLocation.save();

    res.status(201).json({
      success: true,
      message: "Tạo cơ sở mới thành công!",
      data: newLocation
    });
  } catch (error) {
    // 1. CHECK FOR VALIDATION ERROR
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.",
        error: error.message
      });
    }

    // 2. ADD THIS BLOCK TO CHECK FOR DUPLICATE KEY ERROR
    if (error.code === 11000) {
      return res.status(409).json({ // 409 Conflict is a better status code
        success: false,
        message: `Tên cơ sở "${req.body.name}" đã tồn tại. Vui lòng chọn tên khác.`
      });
    }

    // 3. FALLBACK FOR OTHER SERVER ERRORS
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo cơ sở mới.",
      error: error.message
    });
  }
};
const updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params; // Vẫn lấy _id từ params
    const { name, address, phone, email, isActive } = req.body;

    // Tìm và cập nhật trong một bước
    const updatedLocation = await Location.findByIdAndUpdate(
      locationId, // Điều kiện tìm kiếm theo _id
      { name, address, phone, email, isActive }, // Dữ liệu cần cập nhật
      { 
        new: true, // Tùy chọn này để trả về document đã được cập nhật
        runValidators: true // Tùy chọn này để đảm bảo các rule trong schema (như required) được áp dụng
      }
    );

    if (!updatedLocation) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cơ sở." });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin cơ sở thành công!",
      data: updatedLocation
    });

  } catch (error) {
    // Xử lý lỗi trùng tên (unique) khi cập nhật
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Tên cơ sở "${req.body.name}" đã tồn tại.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cơ sở.",
      error: error.message
    });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { locationId } = req.params;

    // Tìm theo _id và cập nhật isActive thành false
    const location = await Location.findByIdAndUpdate(
        locationId, 
        { isActive: false },
        { new: true }
    );

    if (!location) {
      return res.status(404).json({ success: false, message: "Không tìm thấy cơ sở." });
    }

    res.status(200).json({
      success: true,
      message: `Đã vô hiệu hóa cơ sở "${location.name}" thành công.`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa cơ sở.",
      error: error.message
    });
  }
};
module.exports = {
  getManagerProfile,
  updateManagerProfile,
  getAllDoctors,
  getAllStaff,
  getAllLocations,
  getLocationById,
  updateLocation,
  createLocation,
  deleteLocation,
  getDoctorSchedules,
  getStaffSchedules,
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
  updateEquipmentIssueStatus,
  getRevenue,
  getRevenueStatistics,
  getRevenueChartData
};


