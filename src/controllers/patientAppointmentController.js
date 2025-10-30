const crypto = require('crypto');
const mongoose = require('mongoose');
const { Appointment, DoctorSchedule, Doctor, Patient, Location, Notification } = require("../models");
const { formatInTimeZone } = require('date-fns-tz');
// ==================== UTILITY FUNCTIONS ====================

/**
 * Tạo danh sách giờ khả dụng trong ngày (7h, 8h, 9h, 10h, 11h, 13h, 14h, 15h, 16h)
 * @param {Date} date - Ngày cần lấy giờ khả dụng
 * @param {String} locationId - ID cơ sở
 * @returns {Array} - Danh sách giờ khả dụng
 */
const getBaseTimeSlots = () => {
  const timeSlots = [
    "07:00", "08:00", "09:00", "10:00", "11:00",
    "13:00", "14:00", "15:00", "16:00"
  ];
  return timeSlots.map(time => ({
    time,
    displayTime: `${time.split(':')[0]}h`,
    isAvailable: false
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

    const targetDate = new Date(date);
    const targetDateStart = new Date(targetDate.setUTCHours(0, 0, 0, 0));
    const targetDateEnd = new Date(targetDate.setUTCDate(targetDate.getUTCDate() + 1));

    // BƯỚC 1: Tìm tất cả bác sĩ CÓ LỊCH LÀM VIỆC
      const schedules = await DoctorSchedule.find({
      location: new mongoose.Types.ObjectId(locationId),
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
      return res.status(400).json({ success: false, message: "Thiếu thông tin ngày hoặc cơ sở" });
    }

    const appointmentDate = new Date(date);
    // Sử dụng múi giờ Việt Nam để so sánh
    const todayInVietnam = new Date(formatInTimeZone(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'));
    
    const todayStart = new Date(todayInVietnam);
    todayStart.setHours(0, 0, 0, 0);

    if (appointmentDate < todayStart) {
      // Trả về danh sách trống thay vì lỗi để frontend có thể hiển thị
      const emptyTimeSlots = getBaseTimeSlots().map(slot => ({ ...slot, isAvailable: false }));
      return res.status(200).json({
          success: true,
          message: "Ngày đã chọn nằm trong quá khứ.",
          data: {
              date: appointmentDate.toISOString().split('T')[0],
              locationId,
              timeSlots: emptyTimeSlots
          }
      });
    }

    const targetDateStart = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const targetDateEnd = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1);

    // Dùng Promise.all để chạy song song 2 truy vấn
    const [allSchedules, allAppointments] = await Promise.all([
        DoctorSchedule.find({
            location: locationId,
            date: { $gte: targetDateStart, $lt: targetDateEnd },
            isAvailable: true
        }).select('doctor startTime endTime'),
        Appointment.find({
            appointmentDate: { $gte: targetDateStart, $lt: targetDateEnd },
            status: { $in: ["pending", "confirmed"] }
        }).select('doctor startTime')
    ]);

    const timeSlots = getBaseTimeSlots();
    const isToday = appointmentDate.toDateString() === todayInVietnam.toDateString();
    const earliestBookableHour = isToday ? todayInVietnam.getHours() + 2 : -1;

    const availableTimeSlots = timeSlots.map(slot => {
      const time = slot.time;
      const slotHour = parseInt(time.split(':')[0]);

      if (isToday && slotHour < earliestBookableHour) {
        return { ...slot, isAvailable: false };
      }

      const doctorsOnShift = new Set();
      allSchedules.forEach(schedule => {
        if (schedule.startTime <= time && schedule.endTime > time) {
          doctorsOnShift.add(schedule.doctor.toString());
        }
      });

      if (doctorsOnShift.size === 0) {
        return { ...slot, isAvailable: false };
      }

      const doctorsBooked = new Set();
      allAppointments.forEach(appointment => {
        if (appointment.startTime === time) {
          doctorsBooked.add(appointment.doctor.toString());
        }
      });

      let availableDoctorCount = 0;
      doctorsOnShift.forEach(doctorId => {
        if (!doctorsBooked.has(doctorId)) {
          availableDoctorCount++;
        }
      });

      return { ...slot, isAvailable: availableDoctorCount > 0 };
    });

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
    res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách giờ khả dụng" });
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
 * Đặt lịch hẹn (ĐÃ NÂNG CẤP TRANSACTION)
 * POST /api/patient/appointments
 */
const createAppointment = async (req, res) => { 
  const userId = req.user.id;
  const { doctorId, locationId, date, time, reasonForVisit } = req.body;
  if (!doctorId || !locationId || !date || !time) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc." });
  }
  const appointmentDate = new Date(date);
  if (isNaN(appointmentDate.getTime())) {
    return res.status(400).json({ success: false, message: "Ngày không hợp lệ." });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (appointmentDate < today) {
    return res.status(400).json({ success: false, message: "Không thể đặt lịch trong quá khứ" });
  }
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
     return res.status(400).json({ success: false, message: "Giờ không hợp lệ (định dạng HH:MM)" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const patientProfile = await Patient.findOne({ user: userId }).session(session); 
    if (!patientProfile) {
      throw new Error("Không tìm thấy hồ sơ bệnh nhân. Vui lòng cập nhật hồ sơ.");
    }
    const patientId = patientProfile._id; 

    const targetDate = new Date(appointmentDate); 
    const targetDateStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0)); 
    const targetDateEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999)); 

    // 3. KIỂM TRA XUNG ĐỘT (Đọc bên trong transaction)
    const existingSlot = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: { $gte: targetDateStart, $lt: targetDateEnd },
      startTime: time,
      status: { $nin: ['cancelled', 'no-show'] } 
    }).session(session); 

    if (existingSlot) {
      // Nếu tìm thấy -> Race condition!
      throw new Error("Rất tiếc, giờ hẹn này vừa có người khác đặt. Vui lòng chọn giờ khác."); //
    }

    // (Kiểm tra lại DoctorSchedule trong transaction)
    const doctorSchedule = await DoctorSchedule.findOne({
      doctor: doctorId,
      location: locationId,
      date: { $gte: targetDateStart, $lt: targetDateEnd }, 
      startTime: { $lte: time },
      endTime: { $gt: time },
      isAvailable: true
    }).session(session);
    if (!doctorSchedule) {
      throw new Error("Bác sĩ không có lịch làm việc trong giờ này hoặc giờ hẹn không còn khả dụng.");
    }
    // 4. TẠO MỚI (Viết bên trong transaction)
    const appointmentCount = await Appointment.estimatedDocumentCount();
    const appointmentId = `APT${String(appointmentCount + 1).padStart(6, '0')}`;
    const startTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const endTimeMinutes = startTimeMinutes + 60; // Giả định 1 tiếng
    const endHour = Math.floor(endTimeMinutes / 60);
    const endMinute = endTimeMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    const newAppointment = new Appointment({
      appointmentId,
      doctor: doctorId,
      patient: patientId,
      location: locationId,
      schedule: doctorSchedule._id,
      appointmentDate: targetDateStart,
      startTime: time,
      endTime: endTime,
      reasonForVisit: reasonForVisit || "",
      status: "pending", 
      paymentStatus: "pending", 
      bookingType: 'online'
    });

    await newAppointment.save({ session }); 

    // 5. COMMIT TRANSACTION
    await session.commitTransaction();
    session.endSession();

    // === Gửi thông báo sau khi đã chắc chắn lưu ===
    try {
      await Notification.create({
         sender: patientId,
         recipients: [doctorId],
         recipientModel: "Doctor",
         title: "Lịch hẹn mới",
         message: `Có lịch hẹn mới vào ngày ${targetDate.toLocaleDateString('vi-VN')} lúc ${time}`,
         type: "appointment_created",
         relatedData: { appointmentId: newAppointment._id }
      });
    } catch (notifyError) {
      console.error("Lỗi gửi thông báo sau khi đặt lịch:", notifyError);
    }
    // Populate để trả về (không cần session nữa)
    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate({ path: 'doctor', populate: { path: 'user', select: 'fullName' } }) 
      .populate({ path: 'patient', populate: { path: 'user', select: 'fullName' } }) 
      .populate('location', 'name');

    res.status(201).json({
      success: true,
      message: "Đặt lịch hẹn thành công", 
      data: populatedAppointment
    });

  } catch (error) {
    // 6. ROLLBACK TRANSACTION
    await session.abortTransaction();
    session.endSession();

    console.error("Lỗi tạo lịch hẹn:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi đặt lịch hẹn.",
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
    const userId = req.user._id;
    const patient = await Patient.findOne({ user: userId }).select('_id');
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient profile not found." });
    }
    const patientId = patient._id;

    let query = { patient: patientId };
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: 'doctor',
        select: 'user specializations',
        populate: { path: 'user', select: 'fullName' }
      })
      .populate({
        path: 'schedule',
        select: 'location startTime endTime',
        populate: { path: 'location', select: 'name address' }
      })
      .populate('location', 'name address') 
      // === KẾT THÚC THÊM MỚI ===
      .sort({ appointmentDate: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      message: "Successfully retrieved appointment list.",
      data: appointments
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving appointment list.",
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

const generateSelfRescheduleLink = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;
    const patient = await Patient.findOne({ user: userId }).select('_id');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    const patientId = patient._id;
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      patient: patientId
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'Only confirmed appointments can be rescheduled.' });
    }
    if (appointment.hasBeenRescheduled) {
        return res.status(400).json({ success: false, message: 'This appointment has already been rescheduled once and cannot be changed again.' }); 
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiration // Het han sau 1 gio

    appointment.reschedule_token = token;
    appointment.reschedule_token_expires_at = expiresAt;
    await appointment.save();

    res.status(200).json({
        success: true,
        message: 'Reschedule link generated successfully.', 
        token: token
    });

  } catch (error) {
    console.error("Generate reschedule link error:", error);
    res.status(500).json({ success: false, message: "Server error generating reschedule link", error: error.message }); 
  }
};


const verifyRescheduleToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Missing token" });
    }

    // Tim cuoc hen bang token va kiem tra thoi gian het han
    const appointment = await Appointment.findOne({
      reschedule_token: token,
      reschedule_token_expires_at: { $gt: Date.now() },
      status: 'confirmed' // Chi cho phep doi lich 'confirmed'
    }).populate({
      path: 'doctor',
      populate: { path: 'user', select: 'fullName' }
    }).populate('location', 'name');

    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: "Token không hợp lệ, đã hết hạn, hoặc lịch hẹn không còn ở trạng thái 'confirmed'." 
      });
    }

    // Tra ve thong tin cuoc hen cu
    res.status(200).json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error("Verify reschedule token error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * Bệnh nhân xác nhận đổi lịch (ĐÃ NÂNG CẤP TRANSACTION)
 * POST /api/patient/reschedule/confirm
 */
const confirmReschedule = async (req, res) => {
  const {
    token,
    locationId, 
    doctorId,   
    date,       
    time        
  } = req.body;
  // ... (phần kiểm tra input giữ nguyên) ...

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Tìm lịch hẹn gốc (giữ nguyên)
    const appointmentToUpdate = await Appointment.findOne({
      reschedule_token: token, 
      reschedule_token_expires_at: { $gt: Date.now() }, 
      status: 'confirmed'
    }).session(session); 

    if (!appointmentToUpdate) {
      throw new Error("Token không hợp lệ, đã hết hạn, hoặc lịch hẹn không còn ở trạng thái cho phép đổi.");
    }
    if (appointmentToUpdate.hasBeenRescheduled) { 
      throw new Error('Lịch hẹn này đã được đổi một lần và không thể thay đổi lại.');
    }

    const targetDate = new Date(date); 
    const targetDateStart = new Date(new Date(targetDate).setHours(0, 0, 0, 0)); 
    const targetDateEnd = new Date(new Date(targetDate).setHours(23, 59, 59, 999)); 

    const doctorSchedule = await DoctorSchedule.findOne({
        doctor: doctorId,
        location: locationId,
        date: { $gte: targetDateStart, $lt: targetDateEnd },
        startTime: { $lte: time },
        endTime: { $gt: time },
        isAvailable: true
    }).session(session); 
    if (!doctorSchedule) {
      throw new Error("Bác sĩ không có lịch làm việc tại giờ hẹn mới hoặc giờ hẹn không còn khả dụng.");
    }

    // 4. CẬP NHẬT (Giữ nguyên)
    // Chúng ta CỨ CẬP NHẬT. Nếu trùng, CSDL sẽ ném lỗi E11000
    const startTimeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const endTimeMinutes = startTimeMinutes + 60;
    const endHour = Math.floor(endTimeMinutes / 60);
    const endMinute = endTimeMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    appointmentToUpdate.doctor = doctorId;
    appointmentToUpdate.location = locationId;
    appointmentToUpdate.schedule = doctorSchedule._id; 
    appointmentToUpdate.appointmentDate = targetDateStart; 
    appointmentToUpdate.startTime = time;
    appointmentToUpdate.status = 'confirmed'; 
    appointmentToUpdate.hasBeenRescheduled = true; 
    appointmentToUpdate.reschedule_token = null; 
    appointmentToUpdate.reschedule_token_expires_at = null;

    await appointmentToUpdate.save({ session }); // <-- Thao tác này sẽ ném lỗi E11000 nếu trùng

    // 5. COMMIT TRANSACTION (Giữ nguyên)
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Đổi lịch hẹn thành công!", 
      data: appointmentToUpdate
    });

  } catch (error) {
    // 6. ROLLBACK TRANSACTION
    await session.abortTransaction();
    if (error.code === 11000) {
        console.error("Lỗi Race Condition (E11000) khi đổi lịch:", error.message);
        return res.status(409).json({ // 409 Conflict
            success: false,
            message: "Không thể đổi lịch. Giờ hẹn mới này vừa có người khác đặt. Vui lòng chọn lại."
        });
    }

    // Các lỗi khác
    console.error("Lỗi xác nhận đổi lịch:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi xác nhận đổi lịch.",
    });
  } finally {
      session.endSession(); // Luôn đóng session
  }
};

module.exports = {
  getAvailableTimeSlots: getAvailableTimeSlotsAPI,
  getAvailableDoctors: getAvailableDoctorsAPI,
  createAppointment,
  getPatientAppointments,
  cancelAppointment,
  generateSelfRescheduleLink,
  verifyRescheduleToken,
  confirmReschedule
};