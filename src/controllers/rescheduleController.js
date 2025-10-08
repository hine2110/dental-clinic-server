const Appointment = require('../models/Appointment');
const { getAvailableSlots } = require('../services/slotService');
const Notification = require('../models/Notification');


/**
 * @desc    Xác thực token đổi lịch và lấy các créneau giờ trống
 * @route   GET /api/reschedule/verify/:token
 * @access  Public
 */
exports.verifyTokenAndGetSlots = async (req, res) => {
    try {
        const { token } = req.params;

        // Tìm lịch hẹn có token hợp lệ (chưa hết hạn)
        const appointment = await Appointment.findOne({
            reschedule_token: token,
            reschedule_token_expires_at: { $gt: new Date() }
        }).populate('patient', 'user').populate('doctor', 'user');

        if (!appointment) {
            return res.status(400).json({ success: false, message: 'Link đổi lịch không hợp lệ hoặc đã hết hạn.' });
        }

        // Lấy các créneau giờ còn trống trong 7 ngày tới
        const today = new Date();
        const next7Days = new Date();
        next7Days.setDate(today.getDate() + 7);

        const availableSlots = await getAvailableSlots(appointment.doctor._id, today, next7Days);

        res.status(200).json({
            success: true,
            message: 'Token hợp lệ.',
            appointmentInfo: {
                id: appointment._id,
                patientName: appointment.patient.user.fullName,
                doctorName: appointment.doctor.user.fullName,
                currentDate: appointment.appointmentDate,
                currentTime: appointment.startTime
            },
            availableSlots: availableSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};

/**
 * @desc    Bệnh nhân xác nhận đổi lịch hẹn mới
 * @route   POST /api/reschedule/confirm
 * @access  Public
 */
exports.confirmReschedule = async (req, res) => {
    try {
        const { token, newDate, newStartTime, newEndTime } = req.body;

        if (!token || !newDate || !newStartTime || !newEndTime) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết để đổi lịch.' });
        }

        // Tìm lại lịch hẹn có token hợp lệ
        const appointment = await Appointment.findOne({
            reschedule_token: token,
            reschedule_token_expires_at: { $gt: new Date() }
        });

        if (!appointment) {
            return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ hoặc đã hết hạn.' });
        }

        // TODO: Thêm bước kiểm tra lần cuối xem créneau giờ mới có bị người khác đặt mất chưa

        // Cập nhật lịch hẹn
        appointment.appointmentDate = new Date(newDate);
        appointment.startTime = newStartTime;
        appointment.endTime = newEndTime;

        // VÔ CÙNG QUAN TRỌNG: Hủy token sau khi đã sử dụng
        appointment.reschedule_token = null;
        appointment.reschedule_token_expires_at = null;
        
        await appointment.save();

        // (Tùy chọn) Gửi thông báo cho bệnh nhân và bác sĩ
        try {
            const patientUser = await require('../models/Patient').findById(appointment.patient).select('user');
            const doctorUser = await require('../models/Doctor').findById(appointment.doctor).select('user');

             await Notification.create([
                {
                    recipients: [patientUser.user],
                    recipientModel: "User",
                    title: "Lịch hẹn đã được đổi thành công",
                    message: `Lịch hẹn của bạn với bác sĩ đã được đổi thành công sang ${newStartTime} ngày ${new Date(newDate).toLocaleDateString("vi-VN")}.`,
                    type: "appointment_update",
                },
                {
                    recipients: [doctorUser.user],
                    recipientModel: "User",
                    title: "Lịch hẹn của bệnh nhân đã thay đổi",
                    message: `Lịch hẹn với bệnh nhân đã được đổi sang ${newStartTime} ngày ${new Date(newDate).toLocaleDateString("vi-VN")}.`,
                    type: "appointment_update",
                }
            ]);
        } catch (notifyErr) {
            console.error("Lỗi gửi thông báo đổi lịch:", notifyErr);
        }

        res.status(200).json({ success: true, message: 'Lịch hẹn của bạn đã được cập nhật thành công!' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
    }
};