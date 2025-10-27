// controllers/scheduleController.js
const DoctorSchedule = require('../models/DoctorSchedule');
const StaffSchedule = require('../models/StaffSchedule');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Management = require('../models/Management');
const moment = require('moment'); // <-- Cần import moment

const getSchedules = async (req, res) => {
    try {
        const { year, month, employeeId, role, branchId } = req.query;

        // --- Bộ lọc ngày tháng (TÍNH TOÁN TỪ YEAR/MONTH) ---
        const dateFilter = {};
        let targetMonth;

        if (year && month) {
            // Chuyển đổi month (1-12) sang index (0-11)
            const monthIndex = parseInt(month, 10) - 1; 
            targetMonth = moment({ year: parseInt(year, 10), month: monthIndex });

            if (!targetMonth.isValid()) {
                 return res.status(400).json({ success: false, message: 'Năm hoặc tháng không hợp lệ.' });
            }

            const startOfMonth = targetMonth.clone().startOf('month').toDate();
            const endOfMonth = targetMonth.clone().endOf('month').toDate();
             // Đảm bảo lấy cả ngày cuối tháng
             endOfMonth.setHours(23, 59, 59, 999);

            dateFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
            console.log(`[getSchedules] Đang lọc lịch cho tháng: ${year}-${month}`);

        } else {
            // Mặc định: Lấy tháng hiện tại nếu không có year/month
            targetMonth = moment(); // Lấy ngày giờ hiện tại
            const startOfMonth = targetMonth.clone().startOf('month').toDate();
            const endOfMonth = targetMonth.clone().endOf('month').toDate();
            endOfMonth.setHours(23, 59, 59, 999);
            dateFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
            console.warn(`[getSchedules] API /schedules được gọi không có year/month. Mặc định lấy tháng hiện tại: ${targetMonth.format('YYYY-MM')}`);
        }
        // --- Kết thúc bộ lọc ngày tháng ---


        // --- Bộ lọc chung (không đổi) ---
        const commonFilter = { ...dateFilter };
        if (branchId && branchId !== 'all') {
            commonFilter.location = branchId;
        }

        let doctorSchedules = [];
        let staffSchedules = [];
        let combinedSchedules = [];

        // --- Xác định Model và populate (không đổi) ---
        const doctorPopulate = {
            path: 'doctor',
            populate: { path: 'user', select: 'fullName role email phone isActive' }
        };
        const staffPopulate = {
             path: 'staff',
             populate: { path: 'user', select: 'fullName role email phone isActive' }
        };

        // --- Logic truy vấn (không đổi, vẫn dùng commonFilter) ---
        if (employeeId && employeeId !== 'all') {
            // Lọc theo employeeId (là User ID)
            const user = await User.findById(employeeId);
            if (!user) return res.status(404).json({ success: false, message: 'Employee not found.' });

            if (user.role === 'doctor') {
                const doctorProfile = await Doctor.findOne({ user: user._id }).select('_id');
                if (doctorProfile) {
                    doctorSchedules = await DoctorSchedule.find({ ...commonFilter, doctor: doctorProfile._id })
                        .populate(doctorPopulate).sort({ date: 1, startTime: 1 });
                }
            } else if (user.role === 'staff' || user.role === 'management') {
                let staffProfile;
                if(user.role === 'staff') staffProfile = await Staff.findOne({ user: user._id }).select('_id');
                else staffProfile = await Management.findOne({ user: user._id }).select('_id');

                if (staffProfile) {
                    staffSchedules = await StaffSchedule.find({ ...commonFilter, staff: staffProfile._id })
                        .populate(staffPopulate).sort({ date: 1, startTime: 1 });
                }
            }
        } else {
             // Lọc theo Role hoặc lấy tất cả
             const rolesToQuery = role && role !== 'all' ? [role] : ['doctor', 'staff', 'management'];

             if (rolesToQuery.includes('doctor')) {
                 doctorSchedules = await DoctorSchedule.find(commonFilter)
                    .populate(doctorPopulate).sort({ date: 1, startTime: 1 });
             }
             if (rolesToQuery.includes('staff') || rolesToQuery.includes('management')) {
                 let staffFilter = {...commonFilter};
                 if (role && role !== 'all') {
                     const usersWithRole = await User.find({ role: role }).select('_id');
                     const userIds = usersWithRole.map(u => u._id);
                     let staffProfiles;
                     if(role === 'staff') staffProfiles = await Staff.find({ user: { $in: userIds } }).select('_id');
                     else staffProfiles = await Management.find({ user: { $in: userIds } }).select('_id');

                     const staffProfileIds = staffProfiles?.map(p => p._id) || [];
                     if (staffProfileIds.length > 0) {
                        staffFilter.staff = { $in: staffProfileIds };
                     } else {
                         staffSchedules = [];
                         rolesToQuery.splice(rolesToQuery.indexOf(role), 1); 
                     }
                 }
                 if(staffFilter.staff || !(role && role !== 'all')){
                     staffSchedules = await StaffSchedule.find(staffFilter)
                        .populate(staffPopulate).sort({ date: 1, startTime: 1 });
                 }
             }
        }

        // --- Kết hợp và chuẩn hóa kết quả (không đổi) ---
        combinedSchedules = [
            ...doctorSchedules.map(sch => ({
                _id: sch._id,
                employee: sch.doctor?.user,
                date: sch.date,
                startTime: sch.startTime,
                endTime: sch.endTime,
                shiftType: sch.notes,
                isAvailable: sch.isAvailable,
                location: sch.location
            })),
            ...staffSchedules.map(sch => ({
                _id: sch._id,
                employee: sch.staff?.user,
                date: sch.date,
                startTime: sch.startTime,
                endTime: sch.endTime,
                shiftType: sch.notes,
                isAvailable: sch.isAvailable,
                location: sch.location
            }))
        ].filter(sch => sch.employee); // Lọc bỏ lịch không có thông tin employee

        // Sắp xếp lại lần cuối (không đổi)
        combinedSchedules.sort((a, b) => {
             const dateComparison = new Date(a.date) - new Date(b.date);
             if (dateComparison !== 0) return dateComparison;
             if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
             return 0;
        });

        res.status(200).json({ success: true, data: combinedSchedules });

    } catch (error) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ success: false, message: 'Server error fetching schedules.' });
    }
};

module.exports = { getSchedules };