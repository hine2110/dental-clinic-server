const Appointment = require("../models/Appointment");
const DoctorSchedule = require("../models/DoctorSchedule");
// Giả định bạn có hàm này từ patientAppointmentController hoặc một service chung
const { getAvailableTimeSlots } = require('./patientAppointmentController'); 

/**
 * @desc    Xác thực token đổi lịch và lấy thông tin lịch hẹn
 * @route   GET /api/reschedule/verify?token=...
 * @access  Public
 */
const verifyTokenAndGetAppointment = async (req, res) => {
  try {
    // SỬA LẠI: Lấy token từ query parameter
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token không được cung cấp." });
    }

    const appointment = await Appointment.findOne({
      reschedule_token: token,
      reschedule_token_expires_at: { $gt: new Date() }
    }).populate({
        path: 'doctor',
        populate: { path: 'user', select: 'fullName' }
    }).populate({
        path: 'patient',
        populate: { path: 'user', select: 'fullName' }
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Link đổi lịch không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ phòng khám." });
    }

    res.status(200).json({
      success: true,
      message: "Token hợp lệ.",
      data: appointment
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi máy chủ khi xác thực token.", error: error.message });
  }
};

/**
 * @desc    Bệnh nhân xác nhận đổi lịch hẹn mới
 * @route   POST /api/reschedule/update
 * @access  Public
 */
const updateAppointment = async (req, res) => {
  try {
    const { token, newDate, newTime } = req.body;

    if (!token || !newDate || !newTime) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cần thiết (token, ngày mới, giờ mới)." });
    }

    const appointment = await Appointment.findOne({
      reschedule_token: token,
      reschedule_token_expires_at: { $gt: new Date() }
    });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Link đổi lịch không hợp lệ hoặc đã hết hạn." });
    }

    // Cập nhật thông tin
    appointment.appointmentDate = new Date(newDate);
    appointment.startTime = newTime;
    
    // Vô hiệu hóa token
    appointment.reschedule_token = null;
    appointment.reschedule_token_expires_at = null;

    await appointment.save();
    
    // Gửi thông báo (tùy chọn)
    // ... logic gửi thông báo ...

    res.status(200).json({
        success: true,
        message: "Đổi lịch hẹn thành công!",
        data: appointment
    });

  } catch (error) {
     res.status(500).json({ success: false, message: "Lỗi máy chủ khi cập nhật lịch hẹn.", error: error.message });
  }
};

const getDoctorAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query;

        if (!doctorId || !date) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bác sĩ hoặc ngày." });
        }

        const targetDate = new Date(date);
        const targetDateStart = new Date(targetDate.setHours(0, 0, 0, 0));
        const targetDateEnd = new Date(targetDate.setHours(23, 59, 59, 999));

        // Lấy tất cả lịch làm việc và lịch hẹn của bác sĩ trong ngày đó
        const [schedules, appointments] = await Promise.all([
            DoctorSchedule.find({
                doctor: doctorId,
                date: { $gte: targetDateStart, $lt: targetDateEnd },
                isAvailable: true
            }),
            Appointment.find({
                doctor: doctorId,
                appointmentDate: { $gte: targetDateStart, $lt: targetDateEnd },
                status: { $in: ["pending", "confirmed", "checked-in"] }
            })
        ]);

        if (schedules.length === 0) {
            return res.status(200).json({ success: true, data: [] }); // Bác sĩ không làm việc ngày này
        }

        const bookedTimes = new Set(appointments.map(app => app.startTime));
        const availableSlots = [];

        const baseTimeSlots = [
            "07:00", "08:00", "09:00", "10:00",
            "13:00", "14:00", "15:00", "16:00"
        ];

        schedules.forEach(schedule => {
            baseTimeSlots.forEach(time => {
                // Kiểm tra xem giờ có nằm trong ca làm việc không
                if (time >= schedule.startTime && time < schedule.endTime) {
                    // Kiểm tra xem giờ đó đã bị đặt chưa
                    if (!bookedTimes.has(time)) {
                        availableSlots.push({
                            time: time,
                            displayTime: `${time.split(':')[0]}h`,
                            isAvailable: true
                        });
                    }
                }
            });
        });
        
        // Loại bỏ các slot trùng lặp nếu có
        const uniqueSlots = Array.from(new Set(availableSlots.map(s => s.time)))
                               .map(time => availableSlots.find(s => s.time === time));


        res.status(200).json({ success: true, data: uniqueSlots });

    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi máy chủ", error: error.message });
    }
};

module.exports = {
  verifyTokenAndGetAppointment,
  updateAppointment,
  getDoctorAvailableSlots
};

