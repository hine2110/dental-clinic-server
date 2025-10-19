const Appointment = require("../models/Appointment");
const { formatInTimeZone } = require('date-fns-tz');

/**
 * Hàm này sẽ tìm và cập nhật tất cả các lịch hẹn đã quá 15 phút
 * so với giờ hẹn mà vẫn đang ở trạng thái "pending" hoặc "confirmed".
 */
const updateOverdueAppointments = async () => {
    try {
        const nowInVietnam = new Date(formatInTimeZone(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'));
        console.log(`[Task Runner] Running job at: ${nowInVietnam.toISOString()}`);
        const fifteenMinutesAgo = new Date(nowInVietnam.getTime() - 15 * 60 * 1000);
        const targetDate = fifteenMinutesAgo.toISOString().split('T')[0];
        const overdueAppointments = await Appointment.find({
            status: { $in: ['pending', 'confirmed'] },
            appointmentDate: { $lte: targetDate } 
        });
        
        if (overdueAppointments.length === 0) {
            console.log("[Task Runner] No overdue appointments found.");
            return;
        }

        let updatedCount = 0;
        for (const app of overdueAppointments) {
            if (!app.startTime || !app.startTime.includes(':')) {
                console.warn(`[Task Runner] Skipping appointment ${app.appointmentId || app._id} due to invalid or missing startTime.`);
                continue;
            }

            const [hour, minute] = app.startTime.split(':');
            const appointmentDateTime = new Date(app.appointmentDate);
            appointmentDateTime.setHours(hour, minute, 0, 0);

            // Nếu giờ hẹn đã qua 15 phút so với hiện tại
            if (appointmentDateTime < fifteenMinutesAgo) {
                await Appointment.updateOne(
                    { _id: app._id },
                    { $set: { status: 'no-show' } }
                );

                updatedCount++;
                console.log(`[Task Runner] Appointment ${app.appointmentId} updated to no-show.`);
            }
        }

        if(updatedCount > 0) {
            console.log(`[Task Runner] Job finished. Updated ${updatedCount} appointments.`);
        } else {
            console.log("[Task Runner] Job finished. No appointments met the 15-minute overdue criteria.");
        }

    } catch (error) {
        console.error("[Task Runner] Error updating overdue appointments:", error);
    }
};

/**
 * Hàm này sẽ tìm và cập nhật các lịch hẹn tạm hoãn quá 30 phút
 * tự động chuyển sang trạng thái "no-show"
 */
const updateOnHoldToNoShow = async () => {
    try {
        // Lấy thời gian hiện tại
        const now = new Date();
        
        console.log(`[Auto No-Show] Running job at: ${now.toISOString()}`);

        // Tính toán thời gian giới hạn (hiện tại - 30 phút)
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        // Tìm các lịch hẹn tạm hoãn quá 30 phút
        const onHoldAppointments = await Appointment.find({
            status: 'on-hold',
            onHoldAt: { $lte: thirtyMinutesAgo }
        });
        
        if (onHoldAppointments.length === 0) {
            console.log("[Auto No-Show] No on-hold appointments found that are overdue.");
            return;
        }

        let updatedCount = 0;
        for (const appointment of onHoldAppointments) {
            appointment.status = 'no-show';
            appointment.notes = (appointment.notes || '') + `\nTự động chuyển sang không đến sau 30 phút tạm hoãn`;
            await appointment.save();
            updatedCount++;
            console.log(`[Auto No-Show] Appointment ${appointment.appointmentId} auto-updated to no-show.`);
            
            // Gửi thông báo cho bệnh nhân
            try {
                const { Notification } = require('../models');
                await Notification.create({
                    sender: appointment.doctor,
                    recipients: [appointment.patient],
                    recipientModel: "Patient",
                    title: "Lịch hẹn đã bị hủy",
                    message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được tự động hủy do không quay lại sau 30 phút tạm hoãn.`,
                    type: "appointment_auto_cancelled",
                    relatedData: {
                        appointmentId: appointment._id,
                        doctorId: appointment.doctor,
                        patientId: appointment.patient,
                        appointmentDate: appointment.appointmentDate,
                        startTime: appointment.startTime,
                        reason: "Tự động hủy sau 30 phút tạm hoãn"
                    }
                });
            } catch (notificationError) {
                console.error("Error creating auto-cancel notification:", notificationError);
            }
        }

        console.log(`[Auto No-Show] Job finished. Updated ${updatedCount} appointments to no-show.`);

    } catch (error) {
        console.error("[Auto No-Show] Error updating on-hold appointments:", error);
    }
};

module.exports = {
    updateOverdueAppointments,
    updateOnHoldToNoShow
};