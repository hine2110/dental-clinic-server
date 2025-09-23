const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate, authorize } = require("../middlewares/auth");

// Middleware xác thực cho tất cả routes admin
router.use(authenticate);

// Middleware kiểm tra quyền admin
const checkAdminRole = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Chỉ admin mới có thể truy cập chức năng này",
    });
  }
  next();
};

router.use(checkAdminRole);

// ==================== QUẢN LÝ USERS ====================

// GET /api/admin/users - Lấy danh sách tất cả users
router.get("/users", adminController.getAllUsers);

// POST /api/admin/create-account - Tạo tài khoản staff/doctor
router.post("/create-account", adminController.createStaffAccount);

module.exports = router;
