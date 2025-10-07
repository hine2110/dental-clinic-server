const { Doctor, Appointment, Patient, Prescription, Medicine, Service, Notification } = require("../models");
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
    const doctorId = req.user._id;
    const updateData = req.body;

    // Loại bỏ các field không được phép cập nhật
    delete updateData._id;
    delete updateData.user;
    delete updateData.doctorId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const doctor = await Doctor.findOneAndUpdate(
      { user: doctorId },
      updateData,
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

    let query = { doctor: doctor._id };
    
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
      .populate('patient', 'user contactInfo basicInfo')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .populate('schedule', 'location startTime endTime')
      .populate({
        path: 'schedule',
        populate: {
          path: 'location',
          select: 'name address'
        }
      })
      .sort({ appointmentDate: -1, startTime: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lịch hẹn thành công",
      data: {
        appointments,
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
      .populate('patient', 'user basicInfo')
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

    let query = { doctor: doctor._id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const schedules = await DoctorSchedule.find(query)
      .populate('location', 'name address')
      .sort({ date: 1, startTime: 1 });

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

module.exports = {
  // Profile
  getDoctorProfile,
  updateDoctorProfile,
  
  // Appointments
  getDoctorAppointments,
  confirmAppointment,
  cancelAppointment,
  
  // Patients
  getDoctorPatients,
  getPatientDetails,
  
  // Prescriptions
  createPrescription,
  getDoctorPrescriptions,
  
  // Schedule
  getDoctorSchedule
};
