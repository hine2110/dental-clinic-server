const Doctor = require("../models/Doctor");
const DoctorSchedule = require("../models/DoctorSchedule");

const StaffSchedule = require("../models/StaffSchedule");
const Location = require("../models/Location");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const Staff = require("../models/Staff");
const { 
  validateSchedule, 
  calculateWeeklyWorkingHours, 
  calculateMonthlyWorkingHours,
  getWorkingHoursStats 
} = require("../utils/timeValidation");

// ==================== RECEPTIONIST FUNCTIONS ====================

// 1. Quản lý lịch làm việc của doctor
const manageDoctorSchedule = async (req, res) => {
  try {

    const { doctorId, locationId, date, startTime, endTime, isAvailable = true, notes } = req.body;

    const staffId = req.staff._id;

    // Kiểm tra doctor tồn tại
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ"
      });
    }


    // Kiểm tra location tồn tại
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở"
      });
    }

    // Validate lịch làm việc
    const validation = await validateSchedule({
      personId: doctorId,
      date: new Date(date),
      startTime,
      endTime,
      location
    }, "doctor");

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu lịch làm việc không hợp lệ",
        errors: validation.errors
      });
    }

    // Tạo lịch làm việc
    const schedule = new DoctorSchedule({
      doctor: doctorId,
      location: locationId,
      date: new Date(date),
      startTime,
      endTime,
      isAvailable,
      notes,
      createdBy: staffId
    });

    await schedule.save();

    // Populate thông tin để trả về
    await schedule.populate([
      { path: 'doctor', select: 'doctorId user' },
      { path: 'location', select: 'name address' },
      { path: 'createdBy', select: 'user' }
    ]);

    // Gửi thông báo cho doctor được xếp lịch
    await sendDoctorScheduleNotification(schedule, staffId);

    res.status(201).json({
      success: true,
      message: "Tạo lịch làm việc thành công",
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo lịch làm việc",
      error: error.message
    });
  }
};

// 2. Quản lý lịch làm việc của staff
const manageStaffSchedule = async (req, res) => {
  try {
    const { staffId, locationId, date, startTime, endTime, isAvailable = true, notes } = req.body;
    const createdByStaffId = req.staff._id;

    // Kiểm tra staff tồn tại
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên"
      });
    }

    // Kiểm tra location tồn tại
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở"
      });
    }

    // Validate lịch làm việc
    const validation = await validateSchedule({
      personId: staffId,
      date: new Date(date),
      startTime,
      endTime,
      location
    }, "staff");

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu lịch làm việc không hợp lệ",
        errors: validation.errors
      });
    }

    // Tạo lịch làm việc
    const schedule = new StaffSchedule({
      staff: staffId,
      location: locationId,
      date: new Date(date),
      startTime,
      endTime,
      isAvailable,
      notes,
      createdBy: createdByStaffId

    });

    await schedule.save();


    // Populate thông tin để trả về
    await schedule.populate([
      { path: 'staff', select: 'staffType user' },
      { path: 'location', select: 'name address' },
      { path: 'createdBy', select: 'user' }
    ]);

    // Gửi thông báo cho staff được xếp lịch
    await sendStaffScheduleNotification(schedule, createdByStaffId);


    res.status(201).json({
      success: true,
      message: "Tạo lịch làm việc thành công",
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo lịch làm việc",
      error: error.message
    });
  }
};


// 3. Xem lịch làm việc của doctor
const getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId, locationId, date, status, startDate, endDate } = req.query;
    
    let query = {};
    if (doctorId) query.doctor = doctorId;
    if (locationId) query.location = locationId;
    

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };

    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    

    if (status !== undefined) query.isAvailable = status === 'available';

    const schedules = await DoctorSchedule.find(query)
      .populate('doctor', 'doctorId user')

      .populate('location', 'name address')
      .populate('createdBy', 'user')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc thành công",
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message
    });
  }
};

// 4. Xem lịch làm việc của staff
const getStaffSchedules = async (req, res) => {
  try {
    const { staffId, locationId, date, status, startDate, endDate } = req.query;
    
    let query = {};
    if (staffId) query.staff = staffId;
    if (locationId) query.location = locationId;
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    if (status !== undefined) query.isAvailable = status === 'available';

    const schedules = await StaffSchedule.find(query)
      .populate('staff', 'staffType user')
      .populate('location', 'name address')
      .populate('createdBy', 'user')
      .sort({ date: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc thành công",
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message
    });
  }
};

// 3. Chấp nhận đặt lịch của bệnh nhân
const acceptPatientBooking = async (req, res) => {
  try {
    const { appointmentId } = req.params; // Lấy từ URL params
    const { status = "confirmed" } = req.body; // Status từ body
    const staffId = req.staff._id; // Sử dụng staff ID từ middleware


    console.log("=== ACCEPT PATIENT BOOKING ===");
    console.log("AppointmentId:", appointmentId);
    console.log("Status:", status);
    console.log("StaffId:", staffId);

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'user')
      .populate('doctor', 'doctorId user');
      

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    console.log("Found appointment:", appointment);

    // Cập nhật status và staff xử lý
    appointment.status = status;
    appointment.staff = staffId;
    await appointment.save();


    console.log("Appointment updated successfully");

    // Gửi thông báo cho bệnh nhân và doctor

    await sendBookingNotification(appointment, staffId);

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {

    console.error("Error in acceptPatientBooking:", error);

    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lịch hẹn",
      error: error.message
    });
  }
};

// 4. Xem danh sách lịch hẹn chờ duyệt
const getPendingAppointments = async (req, res) => {
  try {
    const { date, doctorId } = req.query;
    
    let query = { status: "pending" }; // Chỉ lấy appointments chờ duyệt
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }
    if (doctorId) query.doctor = doctorId;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'doctorId user')
      .populate('patient', 'user')
      .populate('schedule')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn chờ duyệt thành công",
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch hẹn",
      error: error.message
    });
  }
};

// 5. Xem danh sách lịch hẹn (tất cả)
const getAppointments = async (req, res) => {
  try {
    const { status, date, doctorId } = req.query;
    
    let query = {};
    
    // Mặc định chỉ hiển thị appointments pending nếu không có filter status
    if (status) {
      query.status = status;
    } else {
      // Nếu không có status filter, hiển thị tất cả (pending + confirmed)
      query.status = { $in: ["pending", "confirmed"] };
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }
    if (doctorId) query.doctor = doctorId;

    const appointments = await Appointment.find(query)
      .populate('doctor', 'doctorId user')
      .populate('patient', 'user')
      .populate('staff', 'staffType user')
      .populate('schedule')
      .sort({ appointmentDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch hẹn",
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================


// 1. Gửi thông báo cho doctor khi có DoctorSchedule mới
const sendDoctorScheduleNotification = async (schedule, staffId) => {
  try {
    const doctorId = schedule.doctor._id || schedule.doctor;
    const locationName = schedule.location?.name || "cơ sở";
    const doctorName = schedule.doctor?.doctorId || "Doctor";

    // Thông báo cho doctor được xếp lịch
    const doctorNotification = new Notification({
      sender: staffId,
      recipients: [doctorId],
      recipientModel: "Doctor",
      title: "Lịch làm việc mới",
      message: `Bạn đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')} từ ${schedule.startTime} đến ${schedule.endTime}`,
      type: "doctor_schedule_assigned",
      relatedData: {
        scheduleId: schedule._id,
        scheduleType: "doctor",
        location: schedule.location?._id || schedule.location
      }
    });

    // Thông báo cho các staff khác (để thông báo chung)
    const allStaffs = await Staff.find({}).populate('user');
    const allDoctors = await Doctor.find({}).populate('user');
    
    const allRecipients = [
      ...allStaffs.map(s => s.user._id),
      ...allDoctors.map(d => d.user._id)
    ].filter(id => id.toString() !== doctorId.toString());

    const generalNotification = new Notification({
      sender: staffId,
      recipients: allRecipients,
      recipientModel: "User",
      title: "Cập nhật lịch làm việc",
      message: `${doctorName} đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')}`,
      type: "schedule_update",
      relatedData: {
        scheduleId: schedule._id,
        scheduleType: "doctor",
        assignedPerson: doctorId
      }
    });

    await Promise.all([
      doctorNotification.save(),
      generalNotification.save()
    ]);

  } catch (error) {
    console.error("Lỗi gửi thông báo lịch doctor:", error);
  }
};

// 2. Gửi thông báo cho staff khi có StaffSchedule mới
const sendStaffScheduleNotification = async (schedule, staffId) => {
  try {
    const assignedStaffId = schedule.staff._id || schedule.staff;
    const locationName = schedule.location?.name || "cơ sở";
    const staffName = schedule.staff?.staffType || "Staff";
    const staffUser = schedule.staff?.user;

    // Thông báo cho staff được xếp lịch
    const staffNotification = new Notification({
      sender: staffId,
      recipients: [assignedStaffId],
      recipientModel: "Staff",
      title: "Lịch làm việc mới",
      message: `Bạn đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')} từ ${schedule.startTime} đến ${schedule.endTime}`,
      type: "staff_schedule_assigned",
      relatedData: {
        staffScheduleId: schedule._id,
        scheduleType: "staff",
        location: schedule.location?._id || schedule.location
      }
    });

    // Thông báo cho các staff khác (để thông báo chung)
    const allStaffs = await Staff.find({}).populate('user');
    const allDoctors = await Doctor.find({}).populate('user');
    
    const allRecipients = [
      ...allStaffs.map(s => s.user._id),
      ...allDoctors.map(d => d.user._id)
    ].filter(id => id.toString() !== assignedStaffId.toString());

    const generalNotification = new Notification({
      sender: staffId,
      recipients: allRecipients,
      recipientModel: "User",
      title: "Cập nhật lịch làm việc",
      message: `${staffName} đã được xếp lịch làm việc tại ${locationName} vào ngày ${schedule.date.toLocaleDateString('vi-VN')}`,
      type: "schedule_update",
      relatedData: {
        staffScheduleId: schedule._id,
        scheduleType: "staff",
        assignedPerson: assignedStaffId
      }
    });

    await Promise.all([
      staffNotification.save(),
      generalNotification.save()
    ]);

  } catch (error) {
    console.error("Lỗi gửi thông báo lịch staff:", error);
  }
};

// 3. Gửi thông báo cho doctor khi có patient book lịch được accept
const sendBookingNotification = async (appointment, staffId) => {
  try {
    // Populate appointment nếu chưa có
    if (!appointment.patient || !appointment.doctor) {
      await appointment.populate([
        { path: 'patient', select: 'user' },
        { path: 'doctor', select: 'doctorId user' }
      ]);
    }

    // Thông báo cho bệnh nhân
    const patientNotification = new Notification({
      sender: staffId,
      recipients: [appointment.patient._id || appointment.patient],
      recipientModel: "User",
      title: "Cập nhật lịch hẹn",
      message: `Lịch hẹn của bạn đã được ${appointment.status}`,
      type: "appointment_updated",
      relatedData: {
        appointmentId: appointment._id,
        patientId: appointment.patient._id || appointment.patient
      }
    });

    console.log("Patient notification created:", patientNotification);

    // Thông báo cho doctor được book lịch
    const doctorId = appointment.doctor._id || appointment.doctor;
    const patientName = appointment.patient?.user?.name || appointment.patient?.name || "Bệnh nhân";
    const doctorName = appointment.doctor?.doctorId || "Doctor";

    console.log("DoctorId:", doctorId);
    console.log("PatientName:", patientName);

    const doctorNotification = new Notification({
      sender: staffId,
      recipients: [doctorId],
      recipientModel: "Doctor",
      title: "Lịch hẹn mới",
      message: `${patientName} đã đặt lịch hẹn với bạn vào ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime}`,
      type: "appointment_booked",
      relatedData: {
        appointmentId: appointment._id,
        patientId: appointment.patient._id || appointment.patient,
        doctorId: doctorId
      }
    });

    console.log("Doctor notification created:", doctorNotification);

    const savedNotifications = await Promise.all([
      patientNotification.save(),
      doctorNotification.save()
    ]);

    console.log("Notifications saved successfully:", savedNotifications);

  } catch (error) {
    console.error("Lỗi gửi thông báo đặt lịch:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
  }
};

// 5. Quản lý cơ sở (Location)
const getLocations = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const locations = await Location.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách cơ sở thành công",
      data: locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách cơ sở",
      error: error.message
    });
  }
};

const createLocation = async (req, res) => {
  try {
    const locationData = req.body;
    const staffId = req.staff._id;

    // Tạo locationId tự động nếu không có
    if (!locationData.locationId) {
      const count = await Location.countDocuments();
      locationData.locationId = `LOC${String(count + 1).padStart(3, '0')}`;
    }

    const location = new Location(locationData);
    await location.save();

    res.status(201).json({
      success: true,
      message: "Tạo cơ sở thành công",
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo cơ sở",
      error: error.message
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const updateData = req.body;

    const location = await Location.findByIdAndUpdate(
      locationId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cơ sở"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật cơ sở thành công",
      data: location
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật cơ sở",
      error: error.message
    });
  }
};

// 6. Xem thống kê lịch làm việc của Doctor
const getScheduleStatsDoctor = async (req, res) => {
  try {
    const { startDate, endDate, locationId, doctorId } = req.query;
    
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Mặc định xem 1 tuần từ hôm nay
      start = new Date();
      start.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00
      end = new Date(start);
      end.setDate(end.getDate() + 6); // Kết thúc sau 6 ngày (tổng 7 ngày)
      end.setHours(23, 59, 59, 999); // Kết thúc lúc 23:59:59
    }

    let doctorQuery = { date: { $gte: start, $lte: end } };
    
    if (locationId) {
      doctorQuery.location = locationId;
    }
    
    if (doctorId) {
      doctorQuery.doctor = doctorId;
    }

    console.log('Doctor Query:', doctorQuery); // Debug log
    console.log('Start Date:', start);
    console.log('End Date:', end);

    const doctorSchedules = await DoctorSchedule.find(doctorQuery)
      .populate('doctor', 'doctorId user')
      .populate('location', 'name address')
      .sort({ date: 1, startTime: 1 });

    console.log('Found schedules:', doctorSchedules.length); // Debug log

    // Tính tổng giờ làm việc
    const doctorHours = doctorSchedules.reduce((total, schedule) => {
      const startTime = schedule.startTime.split(':').map(Number);
      const endTime = schedule.endTime.split(':').map(Number);
      const hours = (endTime[0] * 60 + endTime[1] - startTime[0] * 60 - startTime[1]) / 60;
      return total + hours;
    }, 0);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê lịch làm việc doctor thành công",
      data: {
        period: { startDate: start, endDate: end },
        doctorSchedules: {
          count: doctorSchedules.length,
          totalHours: doctorHours,
          schedules: doctorSchedules
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê lịch làm việc doctor",
      error: error.message
    });
  }
};

// 7. Xem thống kê lịch làm việc của Staff
const getScheduleStatsStaff = async (req, res) => {
  try {
    const { startDate, endDate, locationId, staffId } = req.query;
    
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Mặc định xem 1 tuần từ hôm nay
      start = new Date();
      start.setHours(0, 0, 0, 0); // Bắt đầu từ 00:00:00
      end = new Date(start);
      end.setDate(end.getDate() + 6); // Kết thúc sau 6 ngày (tổng 7 ngày)
      end.setHours(23, 59, 59, 999); // Kết thúc lúc 23:59:59
    }

    let staffQuery = { date: { $gte: start, $lte: end } };
    
    if (locationId) {
      staffQuery.location = locationId;
    }
    
    if (staffId) {
      staffQuery.staff = staffId;
    }

    console.log('Staff Query:', staffQuery); // Debug log
    console.log('Start Date:', start);
    console.log('End Date:', end);

    const staffSchedules = await StaffSchedule.find(staffQuery)
      .populate('staff', 'staffType user')
      .populate('location', 'name address')
      .sort({ date: 1, startTime: 1 });

    console.log('Found schedules:', staffSchedules.length); // Debug log

    // Tính tổng giờ làm việc
    const staffHours = staffSchedules.reduce((total, schedule) => {
      const startTime = schedule.startTime.split(':').map(Number);
      const endTime = schedule.endTime.split(':').map(Number);
      const hours = (endTime[0] * 60 + endTime[1] - startTime[0] * 60 - startTime[1]) / 60;
      return total + hours;
    }, 0);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê lịch làm việc staff thành công",
      data: {
        period: { startDate: start, endDate: end },
        staffSchedules: {
          count: staffSchedules.length,
          totalHours: staffHours,
          schedules: staffSchedules
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê lịch làm việc staff",
      error: error.message
    });
  }
};

// 7. Xem thống kê giờ làm việc của doctor
const getDoctorWorkingHours = async (req, res) => {
  try {
    const { doctorId, startDate, endDate, period = "week" } = req.query;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "doctorId là bắt buộc"
      });
    }

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period === "month") {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // Mặc định là tuần hiện tại
      const now = new Date();
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Chủ nhật
      end = new Date(start);
      end.setDate(start.getDate() + 6); // Thứ bảy
    }

    const stats = await getWorkingHoursStats(doctorId, start, end, "doctor");

    res.status(200).json({
      success: true,
      message: "Lấy thống kê giờ làm việc thành công",
      data: {
        doctorId,
        period: { startDate: start, endDate: end },
        ...stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê giờ làm việc",
      error: error.message
    });
  }
};

// 8. Xem thống kê giờ làm việc của staff
const getStaffWorkingHours = async (req, res) => {
  try {
    const { staffId, startDate, endDate, period = "week" } = req.query;
    
    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId là bắt buộc"
      });
    }

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (period === "month") {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // Mặc định là tuần hiện tại
      const now = new Date();
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Chủ nhật
      end = new Date(start);
      end.setDate(start.getDate() + 6); // Thứ bảy
    }

    const stats = await getWorkingHoursStats(staffId, start, end, "staff");

    res.status(200).json({
      success: true,
      message: "Lấy thống kê giờ làm việc thành công",
      data: {
        staffId,
        period: { startDate: start, endDate: end },
        ...stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê giờ làm việc",
      error: error.message
    });
  }
};

// 9. Kiểm tra giờ làm việc còn lại trong tuần
const checkRemainingWorkingHours = async (req, res) => {
  try {
    const { doctorId, staffId, date } = req.query;
    
    // Kiểm tra có ít nhất 1 ID và date
    if ((!doctorId && !staffId) || !date) {
      return res.status(400).json({
        success: false,
        message: "Cần có doctorId hoặc staffId và date"
      });
    }

    // Xác định personId và personType
    let personId, personType;
    if (doctorId) {
      personId = doctorId;
      personType = "doctor";
    } else {
      personId = staffId;
      personType = "staff";
    }

    const checkDate = new Date(date);
    const weeklyHours = await calculateWeeklyWorkingHours(personId, checkDate, personType);
    const remainingHours = 52 - weeklyHours;

    res.status(200).json({
      success: true,
      message: "Kiểm tra giờ làm việc còn lại thành công",
      data: {
        personId,
        personType,
        currentWeekHours: weeklyHours,
        remainingHours: Math.max(0, remainingHours),
        maxWeeklyHours: 52
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra giờ làm việc còn lại",
      error: error.message
    });

  }
};

module.exports = {
  manageDoctorSchedule,
  manageStaffSchedule,
  getDoctorSchedules,
  getStaffSchedules,
  getLocations,
  createLocation,
  updateLocation,
  getScheduleStatsDoctor,
  getScheduleStatsStaff,
  getDoctorWorkingHours,
  getStaffWorkingHours,
  checkRemainingWorkingHours,
  acceptPatientBooking,
  getPendingAppointments,
  getAppointments,
  sendDoctorScheduleNotification,
  sendStaffScheduleNotification,
  sendBookingNotification
};
