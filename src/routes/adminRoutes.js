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

// // ==================== DASHBOARD & THỐNG KÊ ====================

// // GET /api/admin/dashboard - Xem thống kê tổng quan
// router.get("/dashboard", adminController.getDashboardStats);

// // ==================== QUẢN LÝ THIẾT BỊ ====================

// // GET /api/admin/equipment/reports - Xem tất cả báo cáo thiết bị
// router.get("/equipment/reports", adminController.getEquipmentReports);

// // PUT /api/admin/equipment/:equipmentId/status - Cập nhật trạng thái thiết bị
// router.put("/equipment/:equipmentId/status", adminController.updateEquipmentStatus);

// // ==================== QUẢN LÝ HÓA ĐƠN ====================

// // GET /api/admin/invoices - Xem tất cả hóa đơn
// router.get("/invoices", adminController.getAllInvoices);

// // ==================== QUẢN LÝ ĐƠN THUỐC ====================

// // GET /api/admin/prescriptions - Xem tất cả đơn thuốc
// router.get("/prescriptions", adminController.getAllPrescriptions);

module.exports = router;
