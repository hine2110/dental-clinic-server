const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const {
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
} = require('../controllers/doctorController');

const {
  // Medical Records
  createMedicalRecord,
  getDoctorMedicalRecords,
  getMedicalRecordById,
  updateMedicalRecord,
  deleteMedicalRecord,
  completeMedicalRecord,
  getPatientMedicalRecords
} = require('../controllers/medicalRecordController');

// ==================== MIDDLEWARE ====================
// Tất cả routes đều yêu cầu authentication và role doctor
router.use(authenticate);
router.use(authorize('doctor'));

// ==================== DOCTOR PROFILE ====================

/**
 * @route   GET /api/doctor/profile
 * @desc    Lấy thông tin profile của bác sĩ
 * @access  Private (Doctor only)
 */
router.get('/profile', getDoctorProfile);

/**
 * @route   PUT /api/doctor/profile
 * @desc    Cập nhật thông tin profile của bác sĩ
 * @access  Private (Doctor only)
 */
router.put('/profile', updateDoctorProfile);

// ==================== DOCTOR APPOINTMENTS ====================

/**
 * @route   GET /api/doctor/appointments
 * @desc    Lấy danh sách lịch hẹn của bác sĩ
 * @access  Private (Doctor only)
 * @query   status, date, page, limit
 */
router.get('/appointments', getDoctorAppointments);

/**
 * @route   PUT /api/doctor/appointments/:appointmentId/confirm
 * @desc    Xác nhận lịch hẹn
 * @access  Private (Doctor only)
 */
router.put('/appointments/:appointmentId/confirm', confirmAppointment);

/**
 * @route   DELETE /api/doctor/appointments/:appointmentId/cancel
 * @desc    Hủy lịch hẹn
 * @access  Private (Doctor only)
 * @body    reason (optional)
 */
router.delete('/appointments/:appointmentId/cancel', cancelAppointment);

// ==================== DOCTOR PATIENTS ====================

/**
 * @route   GET /api/doctor/patients
 * @desc    Lấy danh sách bệnh nhân của bác sĩ
 * @access  Private (Doctor only)
 * @query   page, limit, search
 */
router.get('/patients', getDoctorPatients);

/**
 * @route   GET /api/doctor/patients/:patientId
 * @desc    Lấy thông tin chi tiết bệnh nhân
 * @access  Private (Doctor only)
 */
router.get('/patients/:patientId', getPatientDetails);

// ==================== DOCTOR PRESCRIPTIONS ====================

/**
 * @route   POST /api/doctor/prescriptions
 * @desc    Tạo đơn thuốc
 * @access  Private (Doctor only)
 * @body    appointmentId, patientId, medications, instructions, services
 */
router.post('/prescriptions', createPrescription);

/**
 * @route   GET /api/doctor/prescriptions
 * @desc    Lấy danh sách đơn thuốc của bác sĩ
 * @access  Private (Doctor only)
 * @query   page, limit, status
 */
router.get('/prescriptions', getDoctorPrescriptions);

// ==================== DOCTOR SCHEDULE ====================

/**
 * @route   GET /api/doctor/schedule
 * @desc    Lấy lịch làm việc của bác sĩ
 * @access  Private (Doctor only)
 * @query   startDate, endDate
 */
router.get('/schedule', getDoctorSchedule);

// ==================== DOCTOR MEDICAL RECORDS ====================

/**
 * @route   POST /api/doctor/medical-records
 * @desc    Tạo hồ sơ bệnh án mới
 * @access  Private (Doctor only)
 * @body    patientId, appointmentId, chiefComplaint, presentIllness, clinicalExamination, diagnosis, treatmentPlan, notes
 */
router.post('/medical-records', createMedicalRecord);

/**
 * @route   GET /api/doctor/medical-records
 * @desc    Lấy danh sách hồ sơ bệnh án của bác sĩ
 * @access  Private (Doctor only)
 * @query   page, limit, status, patientId, startDate, endDate
 */
router.get('/medical-records', getDoctorMedicalRecords);

/**
 * @route   GET /api/doctor/medical-records/:recordId
 * @desc    Lấy chi tiết hồ sơ bệnh án
 * @access  Private (Doctor only)
 */
router.get('/medical-records/:recordId', getMedicalRecordById);

/**
 * @route   PUT /api/doctor/medical-records/:recordId
 * @desc    Cập nhật hồ sơ bệnh án
 * @access  Private (Doctor only)
 */
router.put('/medical-records/:recordId', updateMedicalRecord);

/**
 * @route   DELETE /api/doctor/medical-records/:recordId
 * @desc    Xóa hồ sơ bệnh án (chỉ bản nháp)
 * @access  Private (Doctor only)
 */
router.delete('/medical-records/:recordId', deleteMedicalRecord);

/**
 * @route   PUT /api/doctor/medical-records/:recordId/complete
 * @desc    Hoàn thành hồ sơ bệnh án
 * @access  Private (Doctor only)
 */
router.put('/medical-records/:recordId/complete', completeMedicalRecord);

/**
 * @route   GET /api/doctor/medical-records/patient/:patientId
 * @desc    Lấy hồ sơ bệnh án của bệnh nhân
 * @access  Private (Doctor only)
 */
router.get('/medical-records/patient/:patientId', getPatientMedicalRecords);

module.exports = router;
