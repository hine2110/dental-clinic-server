const Appointment = require("../models/Appointment");
const { formatInTimeZone } = require('date-fns-tz');

/**
 * Hàm này sẽ tìm và cập nhật tất cả các lịch hẹn đã quá 15 phút
 * so với giờ hẹn mà vẫn đang ở trạng thái "pending" hoặc "confirmed".
 */
const updateOverdueAppointments = async () => {
    try {
        // Lấy thời gian hiện tại ở múi giờ Việt Nam
        const nowInVietnam = new Date(formatInTimeZone(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'));
        
        console.log(`[Task Runner] Running job at: ${nowInVietnam.toISOString()}`);

        // Tính toán thời gian giới hạn (hiện tại - 15 phút)
        const fifteenMinutesAgo = new Date(nowInVietnam.getTime() - 15 * 60 * 1000);

        // Tìm các lịch hẹn cần cập nhật
        const overdueAppointments = await Appointment.find({
            // Trạng thái phải là pending hoặc confirmed
            status: { $in: ['pending', 'confirmed'] },
            // Ngày hẹn phải là trong quá khứ hoặc hôm nay
            appointmentDate: { $lte: fifteenMinutesAgo.toISOString().split('T')[0] } 
        });
        
        if (overdueAppointments.length === 0) {
            console.log("[Task Runner] No overdue appointments found.");
            return;
        }

        let updatedCount = 0;
        for (const app of overdueAppointments) {
            const [hour, minute] = app.startTime.split(':');
            const appointmentDateTime = new Date(app.appointmentDate);
            appointmentDateTime.setHours(hour, minute, 0, 0);

            // Nếu giờ hẹn đã qua 15 phút so với hiện tại
            if (appointmentDateTime < fifteenMinutesAgo) {
                app.status = 'no-show';
                await app.save();
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