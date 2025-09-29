const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getPatientProfile, createOrUpdateProfile, getProfileStatus } = require('../controllers/patientProfileController');
const { getPatientServices, getPatientServiceById, getPatientServiceCategories } = require('../controllers/patientServiceController');

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

module.exports = router;
