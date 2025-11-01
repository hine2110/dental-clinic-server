const { Doctor, Appointment, Patient, Prescription, Medicine, Service, Notification, User, DoctorSchedule } = require("../models");
const { formatInTimeZone } = require('date-fns-tz');

// ==================== DOCTOR PROFILE ====================

/**
 * Lấy thông tin profile của bác sĩ
 * GET /api/doctor/profile
 */
const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    const doctor = await Doctor.findOne({ user: doctorId })
      .populate('user', 'fullName email phone avatar')
      .select('-__v');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin bác sĩ thành công",
      data: doctor
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin bác sĩ",
      error: error.message
    });
  }
};

/**
 * Cập nhật thông tin profile của bác sĩ
 * PUT /api/doctor/profile
 */
const updateDoctorProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Xử lý specializations từ FormData (có thể là array)
    let specializations = updateData.specializations;
    if (!Array.isArray(specializations) && specializations) {
      // Nếu là string, chuyển thành array
      specializations = [specializations];
    }
    
    // Xử lý experience từ FormData nested object
    let yearsOfPractice = 0;
    if (updateData['experience[yearsOfPractice]']) {
      yearsOfPractice = parseInt(updateData['experience[yearsOfPractice]']) || 0;
    } else if (updateData.experience && typeof updateData.experience === 'object') {
      yearsOfPractice = parseInt(updateData.experience.yearsOfPractice) || 0;
    } else if (updateData.experience && typeof updateData.experience === 'string') {
      // Nếu là JSON string
      try {
        const exp = JSON.parse(updateData.experience);
        yearsOfPractice = parseInt(exp.yearsOfPractice) || 0;
      } catch (e) {
        yearsOfPractice = 0;
      }
    }

    // Tách riêng phone để cập nhật vào User model
    const { phone, ...doctorUpdateData } = updateData;
    
    // Xóa các field không thuộc Doctor model
    delete doctorUpdateData['experience[yearsOfPractice]'];
    
    // Gán lại specializations và experience
    if (specializations && Array.isArray(specializations)) {
      doctorUpdateData.specializations = specializations;
    }
    
    if (yearsOfPractice !== undefined) {
      doctorUpdateData.experience = {
        yearsOfPractice: yearsOfPractice
      };
    }

    // Loại bỏ các field không được phép cập nhật
    delete doctorUpdateData._id;
    delete doctorUpdateData.user;
    delete doctorUpdateData.doctorId;
    delete doctorUpdateData.createdAt;
    delete doctorUpdateData.updatedAt;

    // Xử lý avatar upload nếu có
    const userUpdateData = {};
    if (phone !== undefined) {
      // Validate phone number format
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không hợp lệ. Phải có đúng 10 chữ số."
        });
      }
      userUpdateData.phone = phone;
    }
    
    // Cập nhật avatar nếu có file upload
    if (req.file) {
      // Lưu relative path thay vì absolute path
      const relativePath = req.file.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
      userUpdateData.avatar = relativePath;
    }

    // Cập nhật User model nếu có dữ liệu cần cập nhật
    if (Object.keys(userUpdateData).length > 0) {
      await User.findByIdAndUpdate(
        userId,
        userUpdateData,
        { new: true, runValidators: true }
      );
    }

    // Cập nhật Doctor model
    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      doctorUpdateData,
      { new: true, runValidators: true }
    ).populate('user', 'fullName email phone avatar');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin bác sĩ thành công",
      data: doctor
    });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin bác sĩ",
      error: error.message
    });
  }
};

// ==================== DOCTOR APPOINTMENTS ====================

/**
 * Lấy danh sách lịch hẹn của bác sĩ
 * GET /api/doctor/appointments
 */
const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { status, date, page = 1, limit = 10 } = req.query;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    let query = { 
      doctor: doctor._id,
      // Doctor có thể xem tất cả appointments (bao gồm pending, confirmed)
      status: { $in: ['pending', 'confirmed', 'checked-in', 'on-hold', 'in-progress', 'waiting-for-results', 'in-treatment', 'completed', 'no-show', 'cancelled'] }
    };
    
    if (status) {
      // Cho phép filter theo tất cả các trạng thái
      if (['pending', 'confirmed', 'checked-in', 'on-hold', 'in-progress', 'waiting-for-results', 'in-treatment', 'completed', 'no-show', 'cancelled'].includes(status)) {
        query.status = status;
      }
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'user contactInfo basicInfo')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      // Walk-in không có schedule, cần populate trực tiếp location
      .populate('location', 'name address')
      .populate('schedule', 'location startTime endTime')
      .populate({
        path: 'schedule',
        populate: {
          path: 'location',
          select: 'name address'
        }
      })
      .populate({
        path: 'selectedServices',
        select: 'name description price category'
      })
      .populate({
        path: 'testServices',
        select: 'serviceName price'
      })
      .sort({ appointmentDate: -1, startTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out appointments with null patient
    const validAppointments = appointments.filter(appointment => appointment.patient && appointment.patient._id);

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: {
        appointments: validAppointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Xác nhận lịch hẹn
 * PUT /api/doctor/appointments/:appointmentId/confirm
 */
const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: "pending"
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể xác nhận"
      });
    }

    appointment.status = "confirmed";
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Lịch hẹn đã được xác nhận",
        message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được bác sĩ xác nhận`,
        type: "appointment_confirmed",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime
        }
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

    res.status(200).json({
      success: true,
      message: "Xác nhận lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Confirm appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xác nhận lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Hủy lịch hẹn
 * DELETE /api/doctor/appointments/:appointmentId/cancel
 */
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: { $in: ["pending", "confirmed"] }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể hủy"
      });
    }

    appointment.status = "cancelled";
    if (reason) {
      appointment.cancellationReason = reason;
    }
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Lịch hẹn đã bị hủy",
        message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã bị bác sĩ hủy${reason ? ': ' + reason : ''}`,
        type: "appointment_cancelled",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          reason: reason
        }
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

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

// ==================== DOCTOR PATIENTS ====================

/**
 * Lấy danh sách bệnh nhân của bác sĩ
 * GET /api/doctor/patients
 */
const getDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { page = 1, limit = 10, search } = req.query;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Lấy danh sách bệnh nhân đã có lịch hẹn với bác sĩ này
    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate('patient')
      .select('patient');

    // Lấy danh sách unique patients
    const patientIds = [...new Set(appointments.map(apt => apt.patient._id.toString()))];

    let query = { _id: { $in: patientIds } };
    
    if (search) {
      query.$or = [
        { 'basicInfo.fullName': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .populate('user', 'fullName email phone avatar')
      .select('basicInfo contactInfo medicalHistory allergies')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bệnh nhân thành công",
      data: {
        patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get doctor patients error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bệnh nhân",
      error: error.message
    });
  }
};

/**
 * Lấy thông tin chi tiết bệnh nhân
 * GET /api/doctor/patients/:patientId
 */
const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Kiểm tra xem bác sĩ có lịch hẹn với bệnh nhân này không
    const hasAppointment = await Appointment.findOne({
      doctor: doctor._id,
      patient: patientId
    });

    if (!hasAppointment) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem thông tin bệnh nhân này"
      });
    }

    const patient = await Patient.findById(patientId)
      .populate('user', 'fullName email phone avatar')
      .select('-__v');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bệnh nhân"
      });
    }

    // Lấy lịch sử lịch hẹn với bác sĩ này
    const appointmentHistory = await Appointment.find({
      doctor: doctor._id,
      patient: patientId
    })
      .populate('schedule', 'location startTime endTime')
      .sort({ appointmentDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Lấy thông tin bệnh nhân thành công",
      data: {
        patient,
        appointmentHistory
      }
    });
  } catch (error) {
    console.error("Get patient details error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin bệnh nhân",
      error: error.message
    });
  }
};

// ==================== DOCTOR PRESCRIPTIONS ====================

/**
 * Tạo đơn thuốc
 * POST /api/doctor/prescriptions
 */
const createPrescription = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { appointmentId, patientId, medications, instructions, services } = req.body;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Kiểm tra appointment có tồn tại và thuộc về bác sĩ này không
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        _id: appointmentId,
        doctor: doctor._id
      });
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lịch hẹn hoặc không có quyền truy cập"
        });
      }
    }

    // Tạo prescription
    const prescription = new Prescription({
      appointment: appointmentId,
      patient: patientId,
      doctor: doctor._id,
      medications: medications || [],
      instructions: instructions || "",
      services: services || [],
      status: "unfinished"
    });

    await prescription.save();

    // Populate để trả về thông tin đầy đủ
    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate('patient', 'user basicInfo')
      .populate('appointment', 'appointmentDate startTime')
      .populate('medications.medicine', 'name description')
      .populate('services', 'name price');

    res.status(201).json({
      success: true,
      message: "Tạo đơn thuốc thành công",
      data: populatedPrescription
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo đơn thuốc",
      error: error.message
    });
  }
};

/**
 * Lấy danh sách đơn thuốc của bác sĩ
 * GET /api/doctor/prescriptions
 */
const getDoctorPrescriptions = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    let query = { doctor: doctor._id };
    if (status) {
      query.status = status;
    }

    const prescriptions = await Prescription.find(query)
      .populate({
        path: 'patient',
        select: 'user basicInfo contactInfo',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .populate('appointment', 'appointmentDate startTime')
      .populate('medications.medicine', 'name description')
      .populate('services', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Prescription.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn thuốc thành công",
      data: {
        prescriptions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get doctor prescriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đơn thuốc",
      error: error.message
    });
  }
};

// ==================== DOCTOR SCHEDULE ====================

/**
 * Lấy lịch làm việc của bác sĩ
 * GET /api/doctor/schedule
 */
const getDoctorSchedule = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { startDate, endDate } = req.query;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Try to find DoctorSchedule, but don't fail if it doesn't exist
    let schedules = [];
    try {
      let query = { doctor: doctor._id };
      
      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      schedules = await DoctorSchedule.find(query)
        .populate('location', 'name address')
        .sort({ date: 1, startTime: 1 });
    } catch (scheduleError) {
      // Continue execution, just return empty schedules
      console.error("DoctorSchedule query error:", scheduleError.message);
    }

    res.status(200).json({
      success: true,
      message: "Lấy lịch làm việc thành công",
      data: {
        doctor: {
          id: doctor._id,
          workSchedule: doctor.workSchedule,
          isAcceptingNewPatients: doctor.isAcceptingNewPatients
        },
        schedules
      }
    });
  } catch (error) {
    console.error("Get doctor schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message
    });
  }
};

/**
 * Hoàn thành khám bệnh
 * PATCH /api/doctor/appointments/:appointmentId/complete
 */
const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: { $in: ["checked-in", "in-progress"] }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể hoàn thành"
      });
    }

    appointment.status = "completed";
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Khám bệnh đã hoàn thành",
        message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được bác sĩ hoàn thành`,
        type: "appointment_completed",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime
        }
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "Hoàn thành khám bệnh thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Complete appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hoàn thành khám bệnh",
      error: error.message
    });
  }
};

/**
 * Đánh dấu bệnh nhân không đến
 * PATCH /api/doctor/appointments/:appointmentId/no-show
 */
const markNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: "checked-in"
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể đánh dấu không đến"
      });
    }

    appointment.status = "no-show";
    if (reason) {
      appointment.notes = (appointment.notes || '') + `\nLý do không đến: ${reason}`;
    }
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Lịch hẹn bị đánh dấu không đến",
        message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được đánh dấu là không đến`,
        type: "appointment_no_show",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          reason: reason
        }
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "Đánh dấu không đến thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Mark no-show error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đánh dấu không đến",
      error: error.message
    });
  }
};

/**
 * Bắt đầu khám bệnh
 * PATCH /api/doctor/appointments/:appointmentId/start-examination
 */
const startExamination = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: { $in: ["checked-in", "on-hold", "waiting-for-results", "in-treatment", "in-progress"] }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc không thể bắt đầu khám"
      });
    }

    appointment.status = "in-progress";
    appointment.onHoldAt = null; // Xóa thời gian tạm hoãn khi bắt đầu khám
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Bác sĩ đã bắt đầu khám bệnh",
        message: `Bác sĩ đã bắt đầu khám bệnh cho lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime}`,
        type: "examination_started",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime
        }
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "Bắt đầu khám bệnh thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Start examination error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi bắt đầu khám bệnh",
      error: error.message
    });
  }
};

/**
 * Tạm hoãn khám bệnh
 * PATCH /api/doctor/appointments/:appointmentId/on-hold
 */
const putOnHold = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctor._id,
      status: "checked-in"
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn hoặc bệnh nhân chưa check-in"
      });
    }

    appointment.status = "on-hold";
    appointment.onHoldAt = new Date(); // Lưu thời gian tạm hoãn
    if (reason) {
      appointment.notes = (appointment.notes || '') + `\nTạm hoãn: ${reason}`;
    }
    await appointment.save();

    // Gửi thông báo cho bệnh nhân
    try {
      await Notification.create({
        sender: doctor._id,
        recipients: [appointment.patient],
        recipientModel: "Patient",
        title: "Lịch hẹn tạm hoãn",
        message: `Lịch hẹn ngày ${appointment.appointmentDate.toLocaleDateString('vi-VN')} lúc ${appointment.startTime} đã được tạm hoãn. Vui lòng quay lại khi có thể.`,
        type: "appointment_on_hold",
        relatedData: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          patientId: appointment.patient,
          appointmentDate: appointment.appointmentDate,
          startTime: appointment.startTime,
          reason: reason
        }
      });
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "Tạm hoãn khám bệnh thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Put on hold error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạm hoãn khám bệnh",
      error: error.message
    });
  }
};

// ==================== MEDICAL RECORDS ====================

/**
 * Lấy chi tiết lịch hẹn cho hồ sơ bệnh án
 * GET /api/doctor/appointments/:id
 */
const getAppointmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: doctor._id
    })
    .populate('location', 'name address')
    .populate({
      path: 'patient',
      select: 'patientId basicInfo contactInfo medicalHistory allergies insuranceInfo',
      populate: {
        path: 'user',
        select: 'fullName email phone'
      }
    })
    .populate({
      path: 'doctor',
      select: 'doctorId specialization',
      populate: {
        path: 'user',
        select: 'fullName email phone'
      }
    })
    .populate({
      path: 'selectedServices',
      select: 'name description price category'
    })
    .populate({
      path: 'testServices',
      select: 'serviceName price'
    })
    .select('-__v');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Get appointment details error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Cập nhật trạng thái lịch hẹn và thông tin khám bệnh
 * PUT /api/doctor/appointments/:id
 */
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const doctorId = req.user._id;

    // Validate status if provided
    const validStatuses = ['checked-in', 'on-hold', 'in-progress', 'waiting-for-results', 'in-treatment', 'completed', 'no-show', 'cancelled'];
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }
    
    const appointment = await Appointment.findOne({
      _id: id,
      doctor: doctor._id
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn"
      });
    }

    // Validate status transition
    const currentStatus = appointment.status;
    const newStatus = updateData.status;
    
    if (newStatus) {
      // Define valid transitions
      const validTransitions = {
        'checked-in': ['on-hold', 'in-progress', 'waiting-for-results', 'in-treatment', 'no-show'],
        'on-hold': ['in-progress', 'waiting-for-results', 'in-treatment', 'no-show'],
        'in-progress': ['waiting-for-results', 'in-treatment', 'completed'],
        'waiting-for-results': ['in-progress', 'completed'],
        'in-treatment': ['in-progress', 'completed'],
        'completed': [], // Cannot change from completed
        'no-show': [], // Cannot change from no-show
        'cancelled': [] // Cannot change from cancelled
      };
      
      if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(newStatus) && currentStatus !== newStatus) {
        return res.status(400).json({
          success: false,
          message: `Không thể chuyển từ trạng thái "${currentStatus}" sang "${newStatus}"`
        });
      }
    }

    // Cập nhật dữ liệu
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        appointment[key] = updateData[key];
      }
    });

    // Nếu chuyển sang completed mà chưa có endTime, tự động ghi lại giờ kết thúc hiện tại (Asia/Ho_Chi_Minh)
    if (newStatus === 'completed' && currentStatus !== 'completed') {
      try {
        if (!appointment.endTime) {
          const nowVN = new Date();
          // Lấy giờ theo múi giờ VN, định dạng HH:mm
          const endTimeVN = nowVN.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
          });
          appointment.endTime = endTimeVN;
        }
      } catch (_) {
        // Bỏ qua lỗi định dạng thời gian, không làm hỏng flow
      }
    }

    await appointment.save();

    // ✅ Tự động tạo Medical Record khi hoàn thành khám bệnh
    if (newStatus === 'completed' && currentStatus !== 'completed') {
      try {
        const MedicalRecord = require('../models/MedicalRecord');
        
        // Tạo medical record từ appointment data
        await MedicalRecord.create({
          patient: appointment.patient,
          doctor: doctor._id,
          appointment: appointment._id,
          visitDate: appointment.appointmentDate || new Date(),
          
          // Step 1: Thông tin khám
          chiefComplaint: appointment.chiefComplaint || 'Không có thông tin',
          presentIllness: appointment.medicalHistory || '',
          
          // Khám lâm sàng
          clinicalExamination: {
            generalAppearance: appointment.physicalExamination?.generalAppearance || '',
            vitalSigns: appointment.physicalExamination?.vitalSigns ? {
              bloodPressure: appointment.physicalExamination.vitalSigns
            } : {},
            oralExamination: {
              teeth: {
                condition: appointment.physicalExamination?.oralExamination || ''
              },
              gums: {
                condition: appointment.physicalExamination?.otherFindings || ''
              }
            },
            dentalExamination: {
              occlusion: appointment.physicalExamination?.occlusionExamination || '',
              periodontal: appointment.labResults || '',
              endodontic: appointment.imagingResults || ''
            }
          },
          
          // Step 3: Chẩn đoán
          diagnosis: {
            primary: appointment.finalDiagnosis || 'Chưa có chẩn đoán',
            secondary: appointment.preliminaryDiagnosis ? [appointment.preliminaryDiagnosis] : [],
            differential: appointment.differentialDiagnosis ? [appointment.differentialDiagnosis] : []
          },
          
          // Step 4 & 5: Điều trị
          treatmentPlan: {
            immediate: appointment.treatmentNotes ? [appointment.treatmentNotes] : [],
            followUp: {
              nextVisit: appointment.followUpDate,
              instructions: appointment.followUpInstructions || '',
              interval: appointment.followUpType || ''
            }
          },
          
          // Điều trị đã thực hiện
          treatmentPerformed: appointment.procedures?.map(proc => ({
            procedure: proc,
            date: appointment.updatedAt || new Date(),
            notes: appointment.treatmentNotes || ''
          })) || [],
          
          // Ghi chú
          notes: [
            appointment.testInstructions,
            appointment.testResults,
            appointment.homeCare,
            appointment.warnings
          ].filter(Boolean).join('\n\n'),
          
          // Trạng thái
          status: 'completed',
          followUpRequired: !!appointment.followUpDate,
          followUpDate: appointment.followUpDate,
          followUpNotes: appointment.followUpInstructions || '',
          
          // Người tạo
          createdBy: doctor._id,
          lastUpdatedBy: doctor._id,

          // Snapshot thêm: đơn thuốc và các trường điều trị/cận lâm sàng
          prescriptions: Array.isArray(appointment.prescriptions) ? appointment.prescriptions : [],
          selectedServices: Array.isArray(appointment.selectedServices) ? appointment.selectedServices : [],
          treatmentNotes: appointment.treatmentNotes || '',
          homeCare: appointment.homeCare || '',
          testServices: Array.isArray(appointment.testServices) ? appointment.testServices : [],
          testInstructions: appointment.testInstructions || '',
          testResults: appointment.testResults || '',
          imagingResults: appointment.imagingResults || '',
          labResults: appointment.labResults || '',
          testImages: Array.isArray(appointment.testImages) ? appointment.testImages : []
        });
        
        console.log('✅ Created medical record for appointment:', appointment.appointmentId);
      } catch (medicalRecordError) {
        console.error('❌ Error creating medical record:', medicalRecordError);
        // Không throw error để không ảnh hưởng đến flow chính
      }
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật lịch hẹn thành công",
      data: appointment
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lịch hẹn",
      error: error.message
    });
  }
};

/**
 * Lấy danh sách thuốc
 * GET /api/medicines
 */
const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find({ isActive: true })
      .select('name description unit price currentStock')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách thuốc thành công",
      data: medicines
    });
  } catch (error) {
    console.error("Get medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thuốc",
      error: error.message
    });
  }
};

module.exports = {
  // Profile
  getDoctorProfile,
  updateDoctorProfile,
  
  // Appointments
  getDoctorAppointments,
  completeAppointment,
  markNoShow,
  startExamination,
  putOnHold,
  getAppointmentDetails,
  updateAppointmentStatus,
  
  // Patients
  getDoctorPatients,
  getPatientDetails,
  
  // Prescriptions
  createPrescription,
  getDoctorPrescriptions,
  
  // Medical Records
  getMedicines,
  
  // Schedule
  getDoctorSchedule
};
