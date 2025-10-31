const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { uploadService, uploadProfile, handleUploadError } = require("../middlewares/upload");
const {
  uploadImage,
  deleteImage,
  getImage,
} = require('../controllers/uploadController');
const {
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

const serviceDoctorController = require('../controllers/serviceDoctorController');

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
 * @route   PATCH /api/doctor/appointments/:appointmentId/complete
 * @desc    Hoàn thành khám bệnh
 * @access  Private (Doctor only)
 */
router.patch('/appointments/:appointmentId/complete', completeAppointment);

/**
 * @route   PATCH /api/doctor/appointments/:appointmentId/no-show
 * @desc    Đánh dấu bệnh nhân không đến
 * @access  Private (Doctor only)
 * @body    reason (optional)
 */
router.patch('/appointments/:appointmentId/no-show', markNoShow);

/**
 * @route   PATCH /api/doctor/appointments/:appointmentId/start-examination
 * @desc    Bắt đầu khám bệnh
 * @access  Private (Doctor only)
 */
router.patch('/appointments/:appointmentId/start-examination', startExamination);

/**
 * @route   PATCH /api/doctor/appointments/:appointmentId/continue-examination
 * @desc    Tiếp tục khám bệnh sau khi có kết quả xét nghiệm
 * @access  Private (Doctor only)
 */
router.patch('/appointments/:appointmentId/continue-examination', startExamination);

/**
 * @route   PATCH /api/doctor/appointments/:appointmentId/on-hold
 * @desc    Tạm hoãn khám bệnh
 * @access  Private (Doctor only)
 * @body    reason (optional)
 */
router.patch('/appointments/:appointmentId/on-hold', putOnHold);

/**
 * @route   GET /api/doctor/appointments/:id
 * @desc    Lấy chi tiết lịch hẹn cho hồ sơ bệnh án
 * @access  Private (Doctor only)
 */
router.get('/appointments/:id', getAppointmentDetails);

/**
 * @route   PUT /api/doctor/appointments/:id
 * @desc    Cập nhật trạng thái lịch hẹn và thông tin khám bệnh
 * @access  Private (Doctor only)
 */
router.put('/appointments/:id', updateAppointmentStatus);

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

// ==================== MEDICINES ====================

/**
 * @route   GET /api/doctor/medicines
 * @desc    Lấy danh sách thuốc
 * @access  Private (Doctor only)
 */
router.get('/medicines', getMedicines);

// ==================== SERVICE DOCTORS ====================

/**
 * @route   GET /api/doctor/service-doctors
 * @desc    Lấy danh sách dịch vụ xét nghiệm/chẩn đoán cho bác sĩ
 * @access  Private (Doctor only)
 * @query   isActive, search
 */
router.get('/service-doctors', serviceDoctorController.getAllServiceDoctors);

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

// ==================== UPLOAD IMAGES ====================

/**
 * @route   POST /api/doctor/upload/image
 * @desc    Upload hình ảnh xét nghiệm
 * @access  Private (Doctor only)
 */
router.post(
  '/upload/image',
  uploadService.single('image'),
  handleUploadError,
  uploadImage
);

/**
 * @route   DELETE /api/doctor/upload/image/:filename
 * @desc    Xóa hình ảnh xét nghiệm
 * @access  Private (Doctor only)
 */
router.delete('/upload/image/:filename', deleteImage);

/**
 * @route   GET /api/doctor/upload/image/:filename
 * @desc    Lấy hình ảnh xét nghiệm
 * @access  Private (Doctor only)
 */
router.get('/upload/image/:filename', getImage);

module.exports = router;
