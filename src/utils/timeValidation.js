const DoctorSchedule = require("../models/DoctorSchedule");
const StaffSchedule = require("../models/StaffSchedule");

/**
 * Kiểm tra định dạng thời gian HH:MM
 * @param {String} time - Thời gian cần kiểm tra
 * @returns {Boolean} - true nếu đúng định dạng
 */
const isValidTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Kiểm tra endTime có sau startTime không
 * @param {String} startTime - Giờ bắt đầu (HH:MM)
 * @param {String} endTime - Giờ kết thúc (HH:MM)
 * @returns {Boolean} - true nếu endTime sau startTime
 */
const isEndTimeAfterStartTime = (startTime, endTime) => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }

  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  return endMinutes > startMinutes;
};

/**
 * Tính số giờ làm việc từ startTime đến endTime
 * @param {String} startTime - Giờ bắt đầu (HH:MM)
 * @param {String} endTime - Giờ kết thúc (HH:MM)
 * @returns {Number} - Số giờ làm việc (có thể là số thập phân)
 */
const calculateWorkingHours = (startTime, endTime) => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return 0;
  }

  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  return (endMinutes - startMinutes) / 60;
};

/**
 * Tính tổng giờ làm việc trong tuần cho doctor hoặc staff
 * @param {String} personId - ID của doctor hoặc staff
 * @param {Date} startDate - Ngày bắt đầu tuần
 * @param {String} personType - "doctor" hoặc "staff"
 * @returns {Number} - Tổng số giờ làm việc trong tuần
 */
const calculateWeeklyWorkingHours = async (personId, startDate, personType = "doctor") => {
  try {
    // Tính ngày kết thúc tuần (7 ngày sau)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    let schedules;
    if (personType === "doctor") {
      schedules = await DoctorSchedule.find({
        doctor: personId,
        date: { $gte: startDate, $lt: endDate },
        isAvailable: true
      });
    } else {
      schedules = await StaffSchedule.find({
        staff: personId,
        date: { $gte: startDate, $lt: endDate },
        isAvailable: true
      });
    }

    let totalHours = 0;
    schedules.forEach(schedule => {
      const hours = calculateWorkingHours(schedule.startTime, schedule.endTime);
      totalHours += hours;
    });

    return totalHours;
  } catch (error) {
    console.error("Error calculating weekly working hours:", error);
    return 0;
  }
};

/**
 * Tính tổng giờ làm việc trong tháng cho doctor hoặc staff
 * @param {String} personId - ID của doctor hoặc staff
 * @param {Date} monthDate - Ngày bất kỳ trong tháng
 * @param {String} personType - "doctor" hoặc "staff"
 * @returns {Number} - Tổng số giờ làm việc trong tháng
 */
const calculateMonthlyWorkingHours = async (personId, monthDate, personType = "doctor") => {
  try {
    // Tính ngày đầu tháng và cuối tháng
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

    let schedules;
    if (personType === "doctor") {
      schedules = await DoctorSchedule.find({
        doctor: personId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isAvailable: true
      });
    } else {
      schedules = await StaffSchedule.find({
        staff: personId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        isAvailable: true
      });
    }

    let totalHours = 0;
    schedules.forEach(schedule => {
      const hours = calculateWorkingHours(schedule.startTime, schedule.endTime);
      totalHours += hours;
    });

    return totalHours;
  } catch (error) {
    console.error("Error calculating monthly working hours:", error);
    return 0;
  }
};

/**
 * Kiểm tra xung đột lịch làm việc
 * @param {String} personId - ID của doctor hoặc staff
 * @param {Date} date - Ngày làm việc
 * @param {String} startTime - Giờ bắt đầu (HH:MM)
 * @param {String} endTime - Giờ kết thúc (HH:MM)
 * @param {String} personType - "doctor" hoặc "staff"
 * @param {String} excludeId - ID của schedule cần loại trừ (khi update)
 * @returns {Boolean} - true nếu có xung đột
 */
const checkScheduleConflict = async (personId, date, startTime, endTime, personType = "doctor", excludeId = null) => {
  try {
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      return true; // Thời gian không hợp lệ
    }

    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    let query = {
      [personType === "doctor" ? "doctor" : "staff"]: personId,
      date: date,
      isAvailable: true
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    let schedules;
    if (personType === "doctor") {
      schedules = await DoctorSchedule.find(query);
    } else {
      schedules = await StaffSchedule.find(query);
    }

    for (let schedule of schedules) {
      const existingStart = schedule.startTime.split(':').map(Number);
      const existingEnd = schedule.endTime.split(':').map(Number);
      const existingStartMinutes = existingStart[0] * 60 + existingStart[1];
      const existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];

      // Kiểm tra xung đột thời gian
      if (
        (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) ||
        (startMinutes === existingStartMinutes && endMinutes === existingEndMinutes)
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking schedule conflict:", error);
    return true; // Trả về true để an toàn
  }
};

/**
 * Kiểm tra xem lịch làm việc có trong giờ hoạt động của location không
 * @param {Object} location - Location object
 * @param {Date} date - Ngày làm việc
 * @param {String} startTime - Giờ bắt đầu (HH:MM)
 * @param {String} endTime - Giờ kết thúc (HH:MM)
 * @returns {Boolean} - true nếu trong giờ hoạt động
 */
const isWithinOperatingHours = (location, date, startTime, endTime) => {
  try {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const operatingHours = location.operatingHours[dayName];
    if (!operatingHours || !operatingHours.isOpen) return false;
    
    const scheduleStart = startTime.split(':').map(Number);
    const scheduleEnd = endTime.split(':').map(Number);
    const operatingStart = operatingHours.openTime.split(':').map(Number);
    const operatingEnd = operatingHours.closeTime.split(':').map(Number);
    
    const scheduleStartMinutes = scheduleStart[0] * 60 + scheduleStart[1];
    const scheduleEndMinutes = scheduleEnd[0] * 60 + scheduleEnd[1];
    const operatingStartMinutes = operatingStart[0] * 60 + operatingStart[1];
    const operatingEndMinutes = operatingEnd[0] * 60 + operatingEnd[1];
    
    return scheduleStartMinutes >= operatingStartMinutes && scheduleEndMinutes <= operatingEndMinutes;
  } catch (error) {
    console.error("Error checking operating hours:", error);
    return false;
  }
};

/**
 * Validate lịch làm việc mới
 * @param {Object} scheduleData - Dữ liệu lịch làm việc
 * @param {String} personType - "doctor" hoặc "staff"
 * @returns {Object} - { isValid: Boolean, errors: Array }
 */
const validateSchedule = async (scheduleData, personType = "doctor") => {
  const errors = [];
  const { personId, date, startTime, endTime, location } = scheduleData;

  try {
    // Kiểm tra định dạng thời gian
    if (!isValidTimeFormat(startTime)) {
      errors.push("startTime phải có định dạng HH:MM");
    }
    if (!isValidTimeFormat(endTime)) {
      errors.push("endTime phải có định dạng HH:MM");
    }

    // Kiểm tra endTime sau startTime
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      errors.push("endTime phải sau startTime");
    }

    // Kiểm tra xung đột lịch
    const hasConflict = await checkScheduleConflict(personId, date, startTime, endTime, personType);
    if (hasConflict) {
      errors.push("Lịch làm việc bị xung đột với lịch đã có");
    }

    // Kiểm tra giờ hoạt động của location
    if (location && !isWithinOperatingHours(location, date, startTime, endTime)) {
      errors.push("Lịch làm việc ngoài giờ hoạt động của cơ sở");
    }

    // Kiểm tra tổng giờ làm việc trong tuần
    const weeklyHours = await calculateWeeklyWorkingHours(personId, date, personType);
    const newScheduleHours = calculateWorkingHours(startTime, endTime);
    
    if (weeklyHours + newScheduleHours > 52) {
      errors.push("Tổng giờ làm việc trong tuần không được vượt quá 52 tiếng");
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  } catch (error) {
    console.error("Error validating schedule:", error);
    return {
      isValid: false,
      errors: ["Lỗi khi validate lịch làm việc"]
    };
  }
};

/**
 * Lấy thống kê giờ làm việc theo khoảng thời gian
 * @param {String} personId - ID của doctor hoặc staff
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @param {String} personType - "doctor" hoặc "staff"
 * @returns {Object} - Thống kê giờ làm việc
 */
const getWorkingHoursStats = async (personId, startDate, endDate, personType = "doctor") => {
  try {
    let schedules;
    if (personType === "doctor") {
      schedules = await DoctorSchedule.find({
        doctor: personId,
        date: { $gte: startDate, $lte: endDate },
        isAvailable: true
      }).populate('location', 'name address').sort({ date: 1, startTime: 1 });
    } else {
      schedules = await StaffSchedule.find({
        staff: personId,
        date: { $gte: startDate, $lte: endDate },
        isAvailable: true
      }).populate('staff', 'staffType user').populate('location', 'name address').sort({ date: 1, startTime: 1 });
    }

    let totalHours = 0;
    let totalDays = 0;
    const dailyHours = {};

    schedules.forEach(schedule => {
      const hours = calculateWorkingHours(schedule.startTime, schedule.endTime);
      totalHours += hours;
      
      const dateStr = schedule.date.toISOString().split('T')[0];
      if (!dailyHours[dateStr]) {
        dailyHours[dateStr] = 0;
        totalDays++;
      }
      dailyHours[dateStr] += hours;
    });

    return {
      totalHours,
      totalDays,
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      dailyHours,
      schedules
    };
  } catch (error) {
    console.error("Error getting working hours stats:", error);
    return {
      totalHours: 0,
      totalDays: 0,
      averageHoursPerDay: 0,
      dailyHours: {},
      schedules: []
    };
  }
};

module.exports = {
  isValidTimeFormat,
  isEndTimeAfterStartTime,
  calculateWorkingHours,
  calculateWeeklyWorkingHours,
  calculateMonthlyWorkingHours,
  checkScheduleConflict,
  isWithinOperatingHours,
  validateSchedule,
  getWorkingHoursStats
};
