const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { getPatientProfile, createOrUpdateProfile, getProfileStatus } = require('../controllers/patientProfileController');

// lay thong tin 
router.get('/profile', authenticate, getPatientProfile);

// tao hoac cap nhat profile
router.post('/profile', authenticate, upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), createOrUpdateProfile);

// kiem tra trang thai
router.get('/profile/status', authenticate, getProfileStatus);

module.exports = router;
