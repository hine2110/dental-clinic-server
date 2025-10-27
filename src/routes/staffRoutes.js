const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/receptionistStaffController");
const storeKepperController = require("../controllers/storeKepperController");
const { authenticate } = require("../middlewares/auth");
const { checkStaffRole, checkPermission, checkStaffType } = require("../middlewares/staff");
const { route } = require("./managementRoutes");
const { upload, handleUploadError } = require("../middlewares/upload");

// Middleware xác thực cho tất cả routes staff
router.use(authenticate);
router.use(checkStaffRole);


// ==================== RECEPTIONIST ROUTES ====================


// Xem lịch làm việc của chính receptionist
router.get("/receptionist/schedules/self",
  checkPermission("viewReceptionistSchedule"),
  receptionistController.viewReceptionistSchedule
);

// Xem thông tin bệnh nhân
router.get("/receptionist/patients/:patientId",
  checkPermission("viewPatientInfo"),
  receptionistController.viewPatientInfo
);

// === (PHẦN THANH TOÁN ĐÃ CẬP NHẬT THEO YÊU CẦU) ===
router.get("/receptionist/payment-queue",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.getPaymentQueue
);

// (MỚI) Lấy tất cả dịch vụ để thanh toán
router.get("/receptionist/billing-services",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.getServicesForBilling
);

router.post("/receptionist/invoices/create",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.createDraftInvoice
);

// (MỚI) Cập nhật giỏ hàng (thêm/bớt dịch vụ)
router.put("/receptionist/invoices/:invoiceId/items",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.updateInvoiceItems
);

router.post("/receptionist/invoices/:invoiceId/apply-discount",
  checkStaffType("receptionist"),
  receptionistController.applyDiscountCode
);

router.post("/receptionist/invoices/:invoiceId/generate-qr",
  checkStaffType("receptionist"),
  receptionistController.generateTransferQrCode
);

// (MỚI) Hoàn tất thanh toán
router.post("/receptionist/invoices/:invoiceId/finalize",
  checkStaffType("receptionist"), 
  receptionistController.finalizePayment
);

router.get("/receptionist/invoices/history",
  checkStaffType("receptionist"), 
  receptionistController.getInvoiceHistory // <-- Hàm controller mới
);

// Xem danh sách lịch hẹn (tất cả)
router.get("/receptionist/appointments",
  checkPermission("viewPatientInfo"),
  receptionistController.getAppointments
);
// Cập nhật trạng thái lịch hẹn (Check-in, Hủy)
router.patch("/receptionist/appointments/:id/status",
  checkPermission("editPatientInfo"),
  receptionistController.updateAppointmentStatus
);
// Tạo link để bệnh nhân tự đổi lịch hẹn
router.post("/receptionist/appointments/:id/generate-reschedule-link",
  checkPermission("editPatientInfo"), // Giả định bạn có quyền này, hoặc tạo quyền mới 'manageAppointments'
  receptionistController.generateRescheduleLink
);

router.get("/receptionist/profile/self",
  checkPermission("editOwnProfile"), // Dùng chung quyền
  receptionistController.getOwnProfile
);

// Chỉnh sửa hồ sơ cá nhân (receptionist)
router.put("/receptionist/profile",
  checkPermission("editOwnProfile"),
  upload.single("avatar"), 
  handleUploadError,
  receptionistController.editOwnProfile
);


// ==================== STORE KEEPER ROUTES ====================

// Xem lịch làm việc của store keeper (self)
router.get("/store/schedules/self",
  checkStaffType("storeKepper"),
  storeKepperController.viewStoreKepperSchedule
);

// // Xem đơn thuốc
// router.get("/store/prescriptions",
//   checkPermission("viewPrescriptions"),
//   storeKepperController.viewPrescriptions
// );

// INVENTORY - Thuốc
router.get("/store/inventory",
  checkStaffType("storeKepper"),
  storeKepperController.viewInventory
);
router.post("/store/inventory",
  checkStaffType("storeKepper"),
  storeKepperController.createMedicine
);
router.put("/store/inventory/:medicineId",
  checkStaffType("storeKepper"),
  storeKepperController.updateMedicine
);
router.delete("/store/inventory/:medicineId",
  checkStaffType("storeKepper"),
  storeKepperController.deleteMedicine
);

// EQUIPMENT
// Báo cáo thiết bị hỏng
router.post("/store/equipment/issues",
  checkStaffType("storeKepper"),
  storeKepperController.reportEquipment
);

router.get("/store/equipment/issues",
  checkStaffType("storeKepper"),
  storeKepperController.viewEquipmentIssues
);

router.get("/store/equipment",
  checkStaffType("storeKepper"),
  storeKepperController.viewEquipment
);
router.post("/store/equipment",
  checkStaffType("storeKepper"),
  storeKepperController.createEquipment
);
router.put("/store/equipment/:equipmentId",
  checkStaffType("storeKepper"),
  storeKepperController.updateEquipment
);
router.delete("/store/equipment/:equipmentId",
  checkStaffType("storeKepper"),
  storeKepperController.deleteEquipment
);

router.get("/store/profile/self",
  checkStaffType("storeKepper"), // Dùng chung quyền
  storeKepperController.getOwnProfile
);

// Chỉnh sửa hồ sơ cá nhân (store keeper)
router.put("/store/profile",
  checkStaffType("storeKepper"),
  upload.single("avatar"), 
  handleUploadError,
  storeKepperController.editOwnProfileStore
);


module.exports = router;