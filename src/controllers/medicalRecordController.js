const { MedicalRecord, Doctor, Patient, Appointment } = require("../models");

// ==================== MEDICAL RECORD MANAGEMENT ====================

/**
 * Tạo hồ sơ bệnh án mới
 * POST /api/doctor/medical-records
 */
const createMedicalRecord = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const {
      patientId,
      appointmentId,
      chiefComplaint,
      presentIllness,
      clinicalExamination,
      diagnosis,
      treatmentPlan,
      notes
    } = req.body;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Kiểm tra bệnh nhân có tồn tại không
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bệnh nhân"
      });
    }

    // Kiểm tra appointment nếu có
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        _id: appointmentId,
        doctor: doctor._id,
        patient: patientId
      });
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy lịch hẹn hoặc không có quyền truy cập"
        });
      }
    }

    // Tạo medical record
    const medicalRecord = new MedicalRecord({
      patient: patientId,
      doctor: doctor._id,
      appointment: appointmentId,
      chiefComplaint,
      presentIllness,
      clinicalExamination,
      diagnosis,
      treatmentPlan,
      notes,
      createdBy: doctor._id,
      status: 'draft'
    });

    await medicalRecord.save();

    // Populate để trả về thông tin đầy đủ
    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate('patient', 'user basicInfo contactInfo')
      .populate('doctor', 'user specializations')
      .populate('appointment', 'appointmentDate startTime')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'fullName'
        }
      });

    res.status(201).json({
      success: true,
      message: "Tạo hồ sơ bệnh án thành công",
      data: populatedRecord
    });
  } catch (error) {
    console.error("Create medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Lấy danh sách hồ sơ bệnh án của bác sĩ
 * GET /api/doctor/medical-records
 */
const getDoctorMedicalRecords = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { page = 1, limit = 10, status, patientId, startDate, endDate } = req.query;

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
    
    if (patientId) {
      query.patient = patientId;
    }
    
    if (startDate && endDate) {
      query.visitDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const medicalRecords = await MedicalRecord.find(query)
      .populate('appointment', 'appointmentDate startTime')
      .populate({
        path: 'patient',
        select: 'user basicInfo contactInfo',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      })
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MedicalRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách hồ sơ bệnh án thành công",
      data: {
        medicalRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Get doctor medical records error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Lấy chi tiết hồ sơ bệnh án
 * GET /api/doctor/medical-records/:recordId
 */
const getMedicalRecordById = async (req, res) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const medicalRecord = await MedicalRecord.findOne({
      _id: recordId,
      doctor: doctor._id
    })
      .populate('patient', 'user basicInfo contactInfo medicalHistory allergies')
      .populate('doctor', 'user specializations')
      .populate('appointment', 'appointmentDate startTime reasonForVisit')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone avatar'
        }
      })
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'fullName'
        }
      });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án hoặc không có quyền truy cập"
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết hồ sơ bệnh án thành công",
      data: medicalRecord
    });
  } catch (error) {
    console.error("Get medical record by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Cập nhật hồ sơ bệnh án
 * PUT /api/doctor/medical-records/:recordId
 */
const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user._id;
    const updateData = req.body;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    // Loại bỏ các field không được phép cập nhật
    delete updateData._id;
    delete updateData.patient;
    delete updateData.doctor;
    delete updateData.recordId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const medicalRecord = await MedicalRecord.findOneAndUpdate(
      { 
        _id: recordId, 
        doctor: doctor._id 
      },
      {
        ...updateData,
        lastUpdatedBy: doctor._id
      },
      { new: true, runValidators: true }
    )
      .populate('patient', 'user basicInfo contactInfo')
      .populate('appointment', 'appointmentDate startTime')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án hoặc không có quyền truy cập"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ bệnh án thành công",
      data: medicalRecord
    });
  } catch (error) {
    console.error("Update medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Xóa hồ sơ bệnh án
 * DELETE /api/doctor/medical-records/:recordId
 */
const deleteMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const medicalRecord = await MedicalRecord.findOneAndDelete({
      _id: recordId,
      doctor: doctor._id,
      status: 'draft' // Chỉ cho phép xóa bản nháp
    });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án hoặc không thể xóa (chỉ có thể xóa bản nháp)"
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa hồ sơ bệnh án thành công"
    });
  } catch (error) {
    console.error("Delete medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Hoàn thành hồ sơ bệnh án
 * PUT /api/doctor/medical-records/:recordId/complete
 */
const completeMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const doctorId = req.user._id;

    // Tìm doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ"
      });
    }

    const medicalRecord = await MedicalRecord.findOneAndUpdate(
      { 
        _id: recordId, 
        doctor: doctor._id 
      },
      { 
        status: 'completed',
        lastUpdatedBy: doctor._id
      },
      { new: true, runValidators: true }
    )
      .populate('patient', 'user basicInfo contactInfo')
      .populate('appointment', 'appointmentDate startTime')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án hoặc không có quyền truy cập"
      });
    }

    res.status(200).json({
      success: true,
      message: "Hoàn thành hồ sơ bệnh án thành công",
      data: medicalRecord
    });
  } catch (error) {
    console.error("Complete medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hoàn thành hồ sơ bệnh án",
      error: error.message
    });
  }
};

/**
 * Lấy hồ sơ bệnh án của bệnh nhân
 * GET /api/doctor/medical-records/patient/:patientId
 */
const getPatientMedicalRecords = async (req, res) => {
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
        message: "Bạn không có quyền xem hồ sơ bệnh án của bệnh nhân này"
      });
    }

    const medicalRecords = await MedicalRecord.find({
      patient: patientId,
      doctor: doctor._id
    })
      .populate('appointment', 'appointmentDate startTime')
      .sort({ visitDate: -1 });

    res.status(200).json({
      success: true,
      message: "Lấy hồ sơ bệnh án của bệnh nhân thành công",
      data: medicalRecords
    });
  } catch (error) {
    console.error("Get patient medical records error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy hồ sơ bệnh án của bệnh nhân",
      error: error.message
    });
  }
};

module.exports = {
  createMedicalRecord,
  getDoctorMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
  completeMedicalRecord,
  getPatientMedicalRecords
};
