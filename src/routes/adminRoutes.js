const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const serviceController = require("../controllers/serviceController");
const discountController = require("../controllers/discountController");
const scheduleController = require('../controllers/scheduleController');
const bookingController = require('../controllers/appointmentController');
const serviceDoctorController = require("../controllers/serviceDoctorController");
const {
  uploadImage,
  deleteImage,
  getImage,
} = require("../controllers/uploadController");
const { authenticate, authorize } = require("../middlewares/auth");
const { upload, handleUploadError } = require("../middlewares/upload");

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

// PATCH /api/admin/users/:id/toggle-status - Ban/Unban user
router.patch("/users/:id/toggle-status", adminController.toggleUserStatus);

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
router.post(
  "/services",
  upload.single("image"),
  handleUploadError,
  serviceController.createService
);

// PUT /api/admin/services/:id - Cập nhật service
router.put(
  "/services/:id",
  upload.single("image"),
  handleUploadError,
  serviceController.updateService
);

// PATCH /api/admin/services/:id/toggle - Toggle trạng thái active/inactive
router.patch("/services/:id/toggle", serviceController.toggleServiceStatus);

// DELETE /api/admin/services/:id - Soft delete service
router.delete("/services/:id", serviceController.deleteService);

// DELETE /api/admin/services/:id/hard - Hard delete service
router.delete("/services/:id/hard", serviceController.hardDeleteService);

// ==================== UPLOAD MANAGEMENT ====================

// POST /api/admin/upload/image - Upload ảnh
router.post(
  "/upload/image",
  upload.single("image"),
  handleUploadError,
  uploadImage
);

// DELETE /api/admin/upload/image/:filename - Xóa ảnh
router.delete("/upload/image/:filename", deleteImage);

// GET /api/admin/upload/image/:filename - Lấy ảnh
router.get("/upload/image/:filename", getImage);

// ==================== QUẢN LÝ DISCOUNTS ==================== // 
// POST /api/admin/discounts - Tạo discount mới
router.post("/discounts", discountController.createDiscount);

// GET /api/admin/discounts - Lấy tất cả discounts
router.get("/discounts", discountController.getAllDiscounts);

// GET /api/admin/discounts/check-code/:code - Kiểm tra mã có tồn tại không
router.get("/discounts/check-code/:code", discountController.checkDiscountCodeExists);

// GET /api/admin/discounts/:id - Lấy discount theo ID
router.get("/discounts/:id", discountController.getDiscountById);

// PUT /api/admin/discounts/:id - Cập nhật discount
router.put("/discounts/:id", discountController.updateDiscount);

// DELETE /api/admin/discounts/:id - Xóa discount
router.delete("/discounts/:id", discountController.deleteDiscount);

// xem lịch làm
router.get('/schedules', scheduleController.getSchedules);

// xem lịch sử khám bênh
router.get('/history/:patientId', bookingController.getPatientMedicalHistory);


// ==================== QUẢN LÝ SERVICES DOCTOR ====================
// GET /api/admin/service-doctors
router.get("/service-doctors", serviceDoctorController.getAllServiceDoctors);

// POST /api/admin/service-doctors
router.post("/service-doctors", serviceDoctorController.createServiceDoctor);

// GET /api/admin/service-doctors/:id
router.get("/service-doctors/:id", serviceDoctorController.getServiceDoctorById);

// PUT /api/admin/service-doctors/:id
router.put("/service-doctors/:id", serviceDoctorController.updateServiceDoctor);

// DELETE /api/admin/service-doctors/:id (Xoá mềm)
router.delete("/service-doctors/:id", serviceDoctorController.deleteServiceDoctor);

// PATCH /api/admin/service-doctors/:id/toggle-status
router.patch("/service-doctors/:id/toggle-status", serviceDoctorController.toggleServiceDoctorStatus);

// DELETE /api/admin/service-doctors/:id/hard-delete (Xoá cứng)
router.delete("/service-doctors/:id/hard-delete", serviceDoctorController.hardDeleteServiceDoctor);

module.exports = router;
