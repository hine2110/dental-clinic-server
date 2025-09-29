const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const serviceController = require("../controllers/serviceController");
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

// ==================== QUẢN LÝ SERVICES ====================

// GET /api/admin/services - Lấy danh sách tất cả services
router.get("/services", serviceController.getAllServices);

// GET /api/admin/services/categories - Lấy danh sách categories
router.get("/services/categories", serviceController.getServiceCategories);

// GET /api/admin/services/:id - Lấy service theo ID
router.get("/services/:id", serviceController.getServiceById);

// POST /api/admin/services - Tạo service mới
router.post("/services", serviceController.createService);

// PUT /api/admin/services/:id - Cập nhật service
router.put("/services/:id", serviceController.updateService);

// PATCH /api/admin/services/:id/toggle - Toggle trạng thái active/inactive
router.patch("/services/:id/toggle", serviceController.toggleServiceStatus);

// DELETE /api/admin/services/:id - Soft delete service
router.delete("/services/:id", serviceController.deleteService);

// DELETE /api/admin/services/:id/hard - Hard delete service
router.delete("/services/:id/hard", serviceController.hardDeleteService);

module.exports = router;
