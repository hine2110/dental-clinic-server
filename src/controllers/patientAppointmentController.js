const Appointment = require("../models/Appointment");
const DoctorSchedule = require("../models/DoctorSchedule");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Location = require("../models/Location");
const Notification = require("../models/Notification");


// ==================== UTILITY FUNCTIONS ====================

/**
 * Tạo danh sách giờ khả dụng trong ngày (7h, 8h, 9h, 10h, 11h, 13h, 14h, 15h, 16h)
 * @param {Date} date - Ngày cần lấy giờ khả dụng
 * @param {String} locationId - ID cơ sở
 * @returns {Array} - Danh sách giờ khả dụng
 */
const getAvailableTimeSlots = (date, locationId) => {
  const timeSlots = [
    "07:00", "08:00", "09:00", "10:00", "11:00", 
    "13:00", "14:00", "15:00", "16:00"
  ];
  
  return timeSlots.map(time => ({
    time,
    displayTime: `${time.split(':')[0]}h`,
    isAvailable: true
  }));
};

/**
 * Kiểm tra xem giờ có khả dụng không dựa trên lịch bác sĩ
 * @param {String} time - Giờ cần kiểm tra (HH:MM)
 * @param {Date} date - Ngày
 * @param {String} locationId - ID cơ sở
 * @returns {Boolean} - true nếu có bác sĩ khả dụng
 */
const isTimeSlotAvailable = async (time, date, locationId) => {
  try {
    console.log(`Checking time slot availability: ${time} on ${date} at location ${locationId}`);
    
    // Tìm bác sĩ có lịch làm việc trong giờ này
    const schedules = await DoctorSchedule.find({
      location: locationId,
      date: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      },
      startTime: { $lte: time },
      endTime: { $gt: time },
      isAvailable: true
    });

    console.log(`Found ${schedules.length} schedules for time ${time}`);
    console.log('Schedules:', schedules);
    
    return schedules.length > 0;
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    return false;
  }
};

/**
 * Lấy danh sách bác sĩ khả dụng trong giờ cụ thể
 * @param {String} time - Giờ (HH:MM)
 * @param {Date} date - Ngày
 * @param {String} locationId - ID cơ sở
 * @returns {Array} - Danh sách bác sĩ khả dụng
 */
/**
 * Lấy danh sách bác sĩ khả dụng trong giờ cụ thể
 * @param {String} time - Giờ (HH:MM)
 * @param {Date} date - Ngày
 * @param {String} locationId - ID cơ sở
 * @returns {Array} - Danh sách bác sĩ khả dụng
 */
const getAvailableDoctors = async (time, date, locationId) => {
  try {
    console.log(`\n--- [DEBUG] Bắt đầu getAvailableDoctors cho giờ ${time} ---`);
    const targetDateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const targetDateEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // BƯỚC 1: Tìm tất cả bác sĩ CÓ LỊCH LÀM VIỆC
    const schedules = await DoctorSchedule.find({
      location: locationId,
      date: { $gte: targetDateStart, $lt: targetDateEnd },
      startTime: { $lte: time },
      endTime: { $gt: time },
      isAvailable: true
    }).populate({
      path: 'doctor',
      populate: { path: 'user', select: 'fullName avatar' },
      select: 'user specializations experience'
    });
    console.log(`[DEBUG] Bước 1: Tìm thấy ${schedules.length} lịch làm việc (schedules).`);

    const validSchedules = schedules.filter(s => s.doctor);
    console.log(`[DEBUG] Sau khi lọc doctor null, còn lại ${validSchedules.length} lịch hợp lệ.`);

    if (validSchedules.length === 0) {
      console.log(`[DEBUG] Không có lịch làm việc hợp lệ. Trả về mảng rỗng.`);
      return [];
    }
    
    const availableDoctorsOnSchedule = validSchedules.map(s => s.doctor);
    const availableDoctorIds = availableDoctorsOnSchedule.map(d => d._id);
    console.log(`[DEBUG] Danh sách ID bác sĩ có lịch làm việc:`, availableDoctorIds.map(id => id.toString()));

    // BƯỚC 2: Tìm tất cả bác sĩ ĐÃ CÓ LỊCH HẸN
    const existingAppointments = await Appointment.find({
      doctor: { $in: availableDoctorIds },
      appointmentDate: { $gte: targetDateStart, $lt: targetDateEnd },
      startTime: time,
      status: { $in: ["pending", "confirmed"] }
    });
    console.log(`[DEBUG] Bước 2: Tìm thấy ${existingAppointments.length} lịch hẹn (appointments) đã tồn tại.`);
    
    const bookedDoctorIds = new Set(existingAppointments.map(app => app.doctor.toString()));
    if (bookedDoctorIds.size > 0) {
      console.log(`[DEBUG] Danh sách ID bác sĩ đã có lịch hẹn:`, Array.from(bookedDoctorIds));
    }

    // BƯỚC 3: Lọc ra những bác sĩ có lịch làm việc NHƯNG CHƯA CÓ LỊCH HẸN
    const trulyAvailableDoctors = availableDoctorsOnSchedule.filter(
      doctor => !bookedDoctorIds.has(doctor._id.toString())
    );
    console.log(`[DEBUG] Bước 3: Sau khi lọc, còn lại ${trulyAvailableDoctors.length} bác sĩ thực sự rảnh.`);

    // Loại bỏ trùng lặp
    const uniqueDoctors = [];
    const doctorIdsSet = new Set();
    for (const doctor of trulyAvailableDoctors) {
      if (!doctorIdsSet.has(doctor._id.toString())) {
        doctorIdsSet.add(doctor._id.toString());
        uniqueDoctors.push(doctor);
      }
    }
    console.log(`[DEBUG] Kết quả cuối cùng: ${uniqueDoctors.length} bác sĩ khả dụng (sau khi loại bỏ trùng lặp).`);
    console.log(`--- [DEBUG] Kết thúc getAvailableDoctors ---\n`);
    return uniqueDoctors;

  } catch (error) {
    console.error("!!! [DEBUG] Lỗi nghiêm trọng trong getAvailableDoctors:", error);
    return [];
  }
};

// ==================== API ENDPOINTS ====================

/**
 * Lấy danh sách giờ khả dụng trong ngày
 * GET /api/patient/appointments/available-times
 */
const getAvailableTimeSlotsAPI = async (req, res) => {
  try {
    const { date, locationId } = req.query;

    if (!date || !locationId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin ngày hoặc cơ sở"
      });
    }

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày không hợp lệ"
      });
    }

    // Kiểm tra ngày không được trong quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: "Không thể đặt lịch trong quá khứ"
      });
    }

    // Lấy danh sách giờ cơ bản
    const timeSlots = getAvailableTimeSlots(appointmentDate, locationId);

    // Kiểm tra từng giờ có bác sĩ khả dụng không
    const availableTimeSlots = [];
    for (const slot of timeSlots) {
      const isAvailable = await isTimeSlotAvailable(slot.time, appointmentDate, locationId);
      availableTimeSlots.push({
        ...slot,
        isAvailable
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy danh sách giờ khả dụng thành công",
      data: {
        date: appointmentDate.toISOString().split('T')[0],
        locationId,
        timeSlots: availableTimeSlots
      }
    });
  } catch (error) {
    console.error("Get available time slots error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách giờ khả dụng",
      error: error.message
    });
  }
};

/**
 * Lấy danh sách bác sĩ khả dụng trong giờ cụ thể
 * GET /api/patient/appointments/available-doctors
 */
const getAvailableDoctorsAPI = async (req, res) => {
  try {
    const { date, time, locationId } = req.query;

    if (!date || !time || !locationId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin ngày, giờ hoặc cơ sở"
      });
    }

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày không hợp lệ"
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: "Giờ không hợp lệ (định dạng HH:MM)"
      });
    }

    const doctors = await getAvailableDoctors(time, appointmentDate, locationId);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bác sĩ khả dụng thành công",
      data: {
        date: appointmentDate.toISOString().split('T')[0],
        time,
        locationId,
        doctors
      }
    });
  } catch (error) {
    console.error("Get available doctors error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bác sĩ",
      error: error.message
    });
  }
};

/**
 * Đặt lịch hẹn
 * POST /api/patient/appointments
 */
const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reasonForVisit } = req.body;
    const patientId = req.patient._id;

    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày không hợp lệ"
      });
    }

    // Kiểm tra ngày không được trong quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: "Không thể đặt lịch trong quá khứ"
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: "Giờ không hợp lệ (định dạng HH:MM)"
      });
    }

    // Kiểm tra bác sĩ có tồn tại không
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ"
      });
    }

    // Kiểm tra bác sĩ có lịch làm việc trong giờ này không
    const doctorSchedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      date: {
        $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
        $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
      },
      startTime: { $lte: time },
      endTime: { $gt: time },
      isAvailable: true
    });

    if (!doctorSchedule) {
      return res.status(400).json({
        success: false,
        message: "Bác sĩ không có lịch làm việc trong giờ này"
      });
    }

    // Kiểm tra xem bệnh nhân đã có lịch hẹn trong giờ này chưa
    const existingAppointment = await Appointment.findOne({
      patient: patientId,
      appointmentDate: {
        $gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
        $lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1)
      },
      startTime: time,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã có lịch hẹn trong giờ này"
      });
    }

    // Tạo appointmentId tự động
    const appointmentCount = await Appointment.countDocuments();
    const appointmentId = `APT${String(appointmentCount + 1).padStart(6, '0')}`;

    // Tính endTime (mặc định 1 tiếng)
    const startTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const endTimeMinutes = startTimeMinutes + 60;
    const endHour = Math.floor(endTimeMinutes / 60);
    const endMinute = endTimeMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Tạo lịch hẹn
    const appointment = new Appointment({
      appointmentId,
      doctor: doctorId,
      patient: patientId,
      schedule: doctorSchedule._id,
      appointmentDate,
      startTime: time,
      endTime: endTime,
      reasonForVisit: reasonForVisit || "",
      status: "pending",
      paymentStatus: "pending"
    });

    await appointment.save();

    // Populate thông tin để trả về
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctor', 'doctorId user specializations')
      .populate('patient', 'user contactInfo')
      .populate('schedule', 'location startTime endTime');

    // Gửi thông báo cho bác sĩ
    try {
      await Notification.create({
        sender: patientId,
        recipients: [doctorId],
        recipientModel: "Doctor",
        title: "Lịch hẹn mới",
        message: `Có lịch hẹn mới vào ngày ${appointmentDate.toLocaleDateString('vi-VN')} lúc ${time}`,
        type: "appointment_created",
        relatedData: {
          appointmentId: appointment._id,
          patientId: patientId,
          doctorId: doctorId,
          appointmentDate,
          startTime: time
        }
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

    res.status(201).json({
      success: true,
      message: "Đặt lịch hẹn thành công",
      data: populatedAppointment
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đặt lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Lấy danh sách lịch hẹn của bệnh nhân
 * GET /api/patient/appointments
 */
const getPatientAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    const patientId = req.patient._id;

    let query = { patient: patientId };
    
    if (status) {
      query.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('doctor', 'doctorId user specializations')
      .populate('schedule', 'location startTime endTime')
      .populate({
        path: 'schedule',
        populate: {
          path: 'location',
          select: 'name address'
        }
      })
      .sort({ appointmentDate: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: appointments
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Hủy lịch hẹn
 * DELETE /api/patient/appointments/:appointmentId
 */
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const patientId = req.patient._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patientId,
      status: { $in: ["pending", "confirmed"] }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể hủy"
      });
    }

    // Cập nhật trạng thái thành cancelled
    appointment.status = "cancelled";
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Hủy lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hủy lịch hẹn",
      error: error.message
    });
  }
};

module.exports = {
  getAvailableTimeSlots: getAvailableTimeSlotsAPI,
  getAvailableDoctors: getAvailableDoctorsAPI,
  createAppointment,
  getPatientAppointments,
  cancelAppointment
};
