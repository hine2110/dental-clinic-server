const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getPatientProfile, createOrUpdateProfile, getProfileStatus } = require('../controllers/patientProfileController');
const { getPatientServices, getPatientServiceById, getPatientServiceCategories } = require('../controllers/patientServiceController');
const { 
  getAvailableTimeSlots: getAvailableTimeSlotsAPI, 
  getAvailableDoctors: getAvailableDoctorsAPI, 
  createAppointment, 
  getPatientAppointments, 
  cancelAppointment,
  generateSelfRescheduleLink
} = require('../controllers/patientAppointmentController');
const { getActiveLocations } = require('../controllers/locationController');

// ==================== PATIENT PROFILE ====================

// lay thong tin 
router.get('/profile', authenticate, getPatientProfile);

// tao hoac cap nhat profile
router.post('/profile', authenticate, createOrUpdateProfile);

// kiem tra trang thai
router.get('/profile/status', authenticate, getProfileStatus);

// ==================== PATIENT SERVICES ====================

// GET /api/patient/services - Lấy danh sách services cho patient
router.get('/services', getPatientServices);

// GET /api/patient/services/categories - Lấy danh mục services
router.get('/services/categories', getPatientServiceCategories);

// GET /api/patient/services/:id - Lấy service theo ID
router.get('/services/:id', getPatientServiceById);

// ==================== PATIENT APPOINTMENTS ====================

// GET /api/patient/appointments/available-times - Lấy danh sách giờ khả dụng
router.get('/appointments/available-times', getAvailableTimeSlotsAPI);

// GET /api/patient/appointments/available-doctors - Lấy danh sách bác sĩ khả dụng
router.get('/appointments/available-doctors', getAvailableDoctorsAPI);

router.get('/locations', getActiveLocations);

// POST /api/patient/appointments - Đặt lịch hẹn
router.post('/appointments', authenticate, createAppointment);

// GET /api/patient/appointments - Lấy danh sách lịch hẹn của bệnh nhân
router.get('/appointments', authenticate, getPatientAppointments);

// DELETE /api/patient/appointments/:appointmentId - Hủy lịch hẹn
router.delete('/appointments/:appointmentId', authenticate, cancelAppointment);

// POST /api/patient/appointments/:appointmentId/generate-reschedule-link - Tạo link đổi lịch cho bệnh nhân
router.post(
  '/appointments/:appointmentId/generate-reschedule-link', authenticate, generateSelfRescheduleLink);

// ==================== RESCHEDULE APPOINTMENTS ====================
// GET /api/patient/reschedule/verify?token=... - Xác minh token đổi lịch
router.get(
  '/reschedule/verify',
  require('../controllers/patientAppointmentController').verifyRescheduleToken
);

// POST /api/patient/reschedule/confirm
// API mới để xác nhận lịch hẹn đã đổi
router.post(
  '/reschedule/confirm',
  require('../controllers/patientAppointmentController').confirmReschedule
);
module.exports = router;
