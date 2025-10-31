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

    // Sao lưu snapshot từ Appointment (nếu có)
    if (appointment) {
      if (Array.isArray(appointment.prescriptions) && appointment.prescriptions.length > 0) {
        medicalRecord.prescriptions = appointment.prescriptions;
      }
      if (Array.isArray(appointment.testServices) && appointment.testServices.length > 0) {
        medicalRecord.testServices = appointment.testServices;
      }
      if (appointment.testInstructions) medicalRecord.testInstructions = appointment.testInstructions;
      if (appointment.testResults) medicalRecord.testResults = appointment.testResults;
      if (appointment.imagingResults) medicalRecord.imagingResults = appointment.imagingResults;
      if (appointment.labResults) medicalRecord.labResults = appointment.labResults;
      if (Array.isArray(appointment.testImages) && appointment.testImages.length > 0) {
        medicalRecord.testImages = appointment.testImages;
      }
      if (Array.isArray(appointment.selectedServices) && appointment.selectedServices.length > 0) {
        medicalRecord.selectedServices = appointment.selectedServices;
      }
      if (appointment.treatmentNotes) medicalRecord.treatmentNotes = appointment.treatmentNotes;
      if (appointment.homeCare) medicalRecord.homeCare = appointment.homeCare;
      if (appointment.followUpDate) medicalRecord.followUpDate = appointment.followUpDate;
      if (appointment.followUpType) medicalRecord.followUpType = appointment.followUpType;
      if (appointment.followUpInstructions) medicalRecord.followUpInstructions = appointment.followUpInstructions;
      if (appointment.warnings) medicalRecord.warnings = appointment.warnings;
    }

    await medicalRecord.save();

    // Populate để trả về thông tin đầy đủ
    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate('patient', 'user basicInfo contactInfo')
      .populate('doctor', 'user specializations')
      .populate('appointment', 'appointmentDate startTime endTime')
      .populate('selectedServices', 'name price')
      .populate('testServices', 'serviceName price')
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
      .populate('appointment', 'appointmentDate startTime endTime')
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
      .populate('appointment', 'appointmentDate startTime endTime reasonForVisit')
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
      .populate('appointment', 'appointmentDate startTime endTime')
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

    // Đồng bộ snapshot từ Appointment trước khi hoàn thành
    const record = await MedicalRecord.findOne({ _id: recordId, doctor: doctor._id }).populate('appointment');
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án hoặc không có quyền truy cập"
      });
    }
    if (record.appointment) {
      const appt = await Appointment.findById(record.appointment);
      if (appt) {
        if (Array.isArray(appt.prescriptions) && appt.prescriptions.length > 0) {
          record.prescriptions = appt.prescriptions;
        }
        record.testServices = appt.testServices || record.testServices;
        record.testInstructions = appt.testInstructions || record.testInstructions;
        record.testResults = appt.testResults || record.testResults;
        record.imagingResults = appt.imagingResults || record.imagingResults;
        record.labResults = appt.labResults || record.labResults;
        record.testImages = appt.testImages && appt.testImages.length ? appt.testImages : record.testImages;
        record.selectedServices = appt.selectedServices || record.selectedServices;
        record.treatmentNotes = appt.treatmentNotes || record.treatmentNotes;
        record.homeCare = appt.homeCare || record.homeCare;
        record.followUpDate = appt.followUpDate || record.followUpDate;
        record.followUpType = appt.followUpType || record.followUpType;
        record.followUpInstructions = appt.followUpInstructions || record.followUpInstructions;
        record.warnings = appt.warnings || record.warnings;
      }
    }

    record.status = 'completed';
    record.lastUpdatedBy = doctor._id;
    await record.save();

    const medicalRecord = await MedicalRecord.findById(record._id)
      .populate('patient', 'user basicInfo contactInfo')
      .populate('appointment', 'appointmentDate startTime endTime')
      .populate('selectedServices', 'name price')
      .populate('testServices', 'serviceName price')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'fullName email phone'
        }
      });

    // medicalRecord chắc chắn tồn tại do đã kiểm tra ở trên

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
