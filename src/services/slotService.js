const DoctorSchedule = require('../models/DoctorSchedule');
const Appointment = require('../models/Appointment');

/**
 * Lấy danh sách các créneau giờ còn trống của một bác sĩ trong một khoảng thời gian.
 * @param {string} doctorId - ID của bác sĩ
 * @param {Date} startDate - Ngày bắt đầu tìm kiếm
 * @param {Date} endDate - Ngày kết thúc tìm kiếm
 * @param {number} slotDuration - Độ dài mỗi créneau giờ (phút), mặc định 30
 * @returns {Array} - Mảng các object créneau giờ trống { date, startTime, endTime }
 */
const getAvailableSlots = async (doctorId, startDate, endDate, slotDuration = 30) => {
    try {
        // 1. Lấy tất cả lịch làm việc của bác sĩ trong khoảng thời gian
        const schedules = await DoctorSchedule.find({
            doctor: doctorId,
            isAvailable: true,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1, startTime: 1 });

        // 2. Lấy tất cả các lịch hẹn đã có của bác sĩ trong khoảng thời gian
        const existingAppointments = await Appointment.find({
            doctor: doctorId,
            status: { $in: ['confirmed', 'pending'] }, // Chỉ xét các lịch hẹn đã xác nhận hoặc đang chờ
            appointmentDate: { $gte: startDate, $lte: endDate }
        });

        const availableSlots = [];
        const slotDurationMs = slotDuration * 60 * 1000;

        // 3. Duyệt qua từng ngày làm việc của bác sĩ
        for (const schedule of schedules) {
            const workDate = new Date(schedule.date);
            
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            
            let currentSlotTime = new Date(workDate);
            currentSlotTime.setUTCHours(startH, startM, 0, 0);

            const endTime = new Date(workDate);
            endTime.setUTCHours(endH, endM, 0, 0);
            
            // 4. Chia ngày làm việc thành các créneau giờ nhỏ
            while (currentSlotTime.getTime() + slotDurationMs <= endTime.getTime()) {
                const slotStart = new Date(currentSlotTime);
                const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

                // 5. Kiểm tra xem créneau giờ này có bị trùng với lịch hẹn đã có không
                const isOverlapping = existingAppointments.some(app => {
                    const appStart = new Date(app.appointmentDate);
                    const [appStartH, appStartM] = app.startTime.split(':').map(Number);
                    appStart.setUTCHours(appStartH, appStartM, 0, 0);
                    
                    const appEnd = new Date(appStart.getTime() + slotDurationMs); // Giả định tất cả lịch hẹn cùng độ dài
                    
                    // Check for overlap: (StartA < EndB) and (EndA > StartB)
                    return slotStart < appEnd && slotEnd > appStart;
                });
                
                // 6. Nếu không trùng, thêm vào danh sách kết quả
                if (!isOverlapping) {
                    availableSlots.push({
                        date: slotStart.toISOString().split('T')[0], // YYYY-MM-DD
                        startTime: slotStart.toISOString().substr(11, 5), // HH:mm
                        endTime: slotEnd.toISOString().substr(11, 5)   // HH:mm
                    });
                }
                
                currentSlotTime.setTime(currentSlotTime.getTime() + slotDurationMs);
            }
        }

        return availableSlots;
    } catch (error) {
        console.error("Error in getAvailableSlots:", error);
        throw new Error("Could not retrieve available slots.");
    }
};

module.exports = { getAvailableSlots };