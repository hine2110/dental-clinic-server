const express = require('express');
const router = express.Router();
const { verifyTokenAndGetAppointment, updateAppointment, getDoctorAvailableSlots } = require('../controllers/rescheduleController');

router.get('/verify', verifyTokenAndGetAppointment);

router.post('/update', updateAppointment);

router.get('/available-slots', getDoctorAvailableSlots);

module.exports = router;