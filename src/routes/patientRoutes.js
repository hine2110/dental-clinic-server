const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getPatientProfile, createOrUpdateProfile, getProfileStatus } = require('../controllers/patientProfileController');

// lay thong tin 
router.get('/profile', authenticate, getPatientProfile);

// tao hoac cap nhat profile
router.post('/profile', authenticate, createOrUpdateProfile);

// kiem tra trang thai
router.get('/profile/status', authenticate, getProfileStatus);

module.exports = router;
