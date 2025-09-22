const Doctor = require("../../models/Doctor");
const DoctorSchedule = require("../../models/DoctorSchedule");
const Appointment = require("../../models/Appointment");
const Notification = require("../../models/Notification");
const Staff = require("../../models/Staff");

// ==================== RECEPTIONIST FUNCTIONS ====================

// 1. Quản lý lịch làm việc của doctor
const manageDoctorSchedule = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, isAvailable = true } = req.body;
    const staffId = req.staff._id;

    // Kiểm tra doctor tồn tại
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ"
      });
    }

    // Tạo lịch làm việc
    const schedule = new DoctorSchedule({
      doctor: doctorId,
      staff: staffId,
      date: new Date(date),
      startTime,
      endTime,
      isAvailable
    });

    await schedule.save();

    // Gửi thông báo cho doctor và các staff khác
    await sendScheduleNotification(schedule, staffId);

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

// 2. Xem lịch làm việc của doctor
const getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId, date, status } = req.query;
    
    let query = {};
    if (doctorId) query.doctor = doctorId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    if (status !== undefined) query.isAvailable = status === 'available';

    const schedules = await DoctorSchedule.find(query)
      .populate('doctor', 'doctorId user')
      .populate('staff', 'user')
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

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    // Cập nhật status và staff xử lý
    appointment.status = status;
    appointment.staff = staffId;
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    await sendBookingNotification(appointment, staffId);

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {
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

// Gửi thông báo lịch làm việc
const sendScheduleNotification = async (schedule, staffId) => {
  try {
    // Lấy tất cả staff và doctor
    const staffs = await Staff.find({}).populate('user');
    const doctors = await Doctor.find({}).populate('user');
    
    const recipients = [
      ...staffs.map(s => s.user._id),
      ...doctors.map(d => d.user._id)
    ];

    const notification = new Notification({
      sender: staffId,
      recipients,
      title: "Cập nhật lịch làm việc",
      message: `Lịch làm việc mới đã được tạo cho ngày ${schedule.date}`,
      type: "schedule_update",
      relatedData: {
        scheduleId: schedule._id
      }
    });

    await notification.save();
  } catch (error) {
    console.error("Lỗi gửi thông báo:", error);
  }
};

// Gửi thông báo đặt lịch
const sendBookingNotification = async (appointment, staffId) => {
  try {
    const notification = new Notification({
      sender: staffId,
      recipients: [appointment.patient],
      title: "Cập nhật lịch hẹn",
      message: `Lịch hẹn của bạn đã được ${appointment.status}`,
      type: "general",
      relatedData: {
        appointmentId: appointment._id
      }
    });

    await notification.save();
  } catch (error) {
    console.error("Lỗi gửi thông báo:", error);
  }
};

module.exports = {
  manageDoctorSchedule,
  getDoctorSchedules,
  acceptPatientBooking,
  getPendingAppointments,
  getAppointments,
  sendScheduleNotification,
  sendBookingNotification
};
