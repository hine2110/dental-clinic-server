const express = require('express');
const router = express.Router();
const { verifyTokenAndGetSlots, confirmReschedule } = require('../controllers/rescheduleController');

// Route công khai để bệnh nhân xác thực token và xem lịch trống
router.get('/verify/:token', verifyTokenAndGetSlots);

// Route công khai để bệnh nhân xác nhận lịch hẹn mới
router.post('/confirm', confirmReschedule);

module.exports = router;