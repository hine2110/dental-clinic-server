const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/receptionistStaffController");
const storeKepperController = require("../controllers/storeKepperController");
const { authenticate } = require("../middlewares/auth");
// (Ghi chú: checkPermission không còn được sử dụng ở đây, nhưng vẫn import)
const { checkStaffRole, checkPermission, checkStaffType } = require("../middlewares/staff");
const { route } = require("./managementRoutes");
const { uploadProfile, handleUploadError } = require("../middlewares/upload");

// Middleware xác thực cho tất cả routes staff
router.use(authenticate);
router.use(checkStaffRole); // Vẫn giữ để xác nhận là staff và lấy req.staff

router.get("/my-locations-today", receptionistController.getMyLocationsForToday);


// ==================== RECEPTIONIST ROUTES ====================
// (Tất cả đã được đồng bộ sang checkStaffType)

// Tối ưu 1: Tìm bệnh nhân bằng CCCD
router.get("/receptionist/patients/find-by-idcard/:idCard",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.findPatientByIdCard
);

// Tối ưu 2: Lấy bác sĩ rảnh theo (cơ sở, ngày, giờ)
router.get("/receptionist/available-doctors",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.getAvailableDoctorsForApi
);

// (Route trùng lặp, đã xóa bớt 1)

// Tối ưu 6: Xếp hàng tự động cho khách vãng lai
router.post("/receptionist/queue-walk-in-patient",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.queueWalkInPatient
);

// Xem lịch làm việc của chính receptionist
router.get("/receptionist/schedules/self",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.viewReceptionistSchedule
);

// Xem thông tin bệnh nhân
router.get("/receptionist/patients/:patientId",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.viewPatientInfo
);

// === (PHẦN THANH TOÁN - Giữ nguyên vì đã dùng checkStaffType) ===
router.get("/receptionist/payment-queue",
  checkStaffType("receptionist"), 
  receptionistController.getPaymentQueue
);

router.get("/receptionist/billing-services",
  checkStaffType("receptionist"), 
  receptionistController.getServicesForBilling
);

router.post("/receptionist/invoices/create",
  checkStaffType("receptionist"), 
  receptionistController.createDraftInvoice
);

router.put("/receptionist/invoices/:invoiceId/items",
  checkStaffType("receptionist"), 
  receptionistController.updateInvoiceItems
);

// Tạo lịch hẹn vãng lai (Cũ)
router.post("/receptionist/walk-in-appointment",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.createWalkInAppointment
);

router.post("/receptionist/invoices/:invoiceId/apply-discount",
  checkStaffType("receptionist"),
  receptionistController.applyDiscountCode
);

router.post("/receptionist/invoices/:invoiceId/generate-qr",
  checkStaffType("receptionist"),
  receptionistController.generateTransferQrCode
);

router.post("/receptionist/invoices/:invoiceId/finalize",
  checkStaffType("receptionist"), 
  receptionistController.finalizePayment
);

router.get("/receptionist/invoices/history",
  checkStaffType("receptionist"), 
  receptionistController.getInvoiceHistory
);

// Xem danh sách lịch hẹn (tất cả)
router.get("/receptionist/appointments",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.getAppointments
);

// Cập nhật trạng thái lịch hẹn (Check-in, Hủy)
router.patch("/receptionist/appointments/:id/status",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.updateAppointmentStatus
);

// Tạo link để bệnh nhân tự đổi lịch hẹn
router.post("/receptionist/appointments/:id/generate-reschedule-link",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.generateRescheduleLink
);

// Lấy hồ sơ cá nhân (receptionist)
router.get("/receptionist/profile/self",
  checkStaffType("receptionist"), // <-- ĐÃ THAY ĐỔI
  receptionistController.getOwnProfile
);

// Chỉnh sửa hồ sơ cá nhân (receptionist)
router.put("/receptionist/profile",
  checkStaffType("receptionist"),
  uploadProfile.single("avatar"), 
  handleUploadError,
  receptionistController.editOwnProfile
);


// ==================== STORE KEEPER ROUTES ====================
// (Toàn bộ phần này giữ nguyên vì đã sử dụng checkStaffType("storeKepper"))

router.get("/store/schedules/self",
  checkStaffType("storeKepper"),
  storeKepperController.viewStoreKepperSchedule
);

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

// Hồ sơ cá nhân (store keeper)
router.get("/store/profile/self",
  checkStaffType("storeKepper"), 
  storeKepperController.getOwnProfile
);
router.put("/store/profile",
  checkStaffType("storeKepper"),
  uploadProfile.single("avatar"), 
  handleUploadError,
  storeKepperController.editOwnProfileStore
);


module.exports = router;