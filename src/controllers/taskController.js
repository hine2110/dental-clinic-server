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

module.exports = {
    updateOverdueAppointments
};