const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/receptionistStaffController");
const storeKepperController = require("../controllers/storeKepperController");
const { authenticate } = require("../middlewares/auth");
const { checkStaffRole, checkPermission } = require("../middlewares/staff");

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

// tạo hóa đơn
router.post("/receptionist/invoices/create",
  checkPermission("createInvoice"),
  receptionistController.createInvoice
);


// Xem danh sách lịch hẹn (tất cả)
router.get("/receptionist/appointments",
  checkPermission("viewPatientInfo"),
  receptionistController.getAppointments
);

// Tạo link để bệnh nhân tự đổi lịch hẹn
router.post("/receptionist/appointments/:id/generate-reschedule-link",
  checkPermission("editPatientInfo"), // Giả định bạn có quyền này, hoặc tạo quyền mới 'manageAppointments'
  receptionistController.generateRescheduleLink
);

// Chỉnh sửa hồ sơ cá nhân (receptionist)
router.put("/receptionist/profile",
  checkPermission("editOwnProfile"),
  receptionistController.editOwnProfile
);


// ==================== STORE KEEPER ROUTES ====================

// Xem lịch làm việc của store keeper (self)
router.get("/store/schedules/self",
  checkPermission("viewStoreKepperSchedule"),
  storeKepperController.viewStoreKepperSchedule
);

// Xem đơn thuốc
router.get("/store/prescriptions",
  checkPermission("viewPrescriptions"),
  storeKepperController.viewPrescriptions
);

// INVENTORY - Thuốc
router.get("/store/inventory",
  checkPermission("viewInventory"),
  storeKepperController.viewInventory
);
router.post("/store/inventory",
  checkPermission("createMedicine"),
  storeKepperController.createMedicine
);
router.put("/store/inventory/:medicineId",
  checkPermission("updateMedicine"),
  storeKepperController.updateMedicine
);
router.delete("/store/inventory/:medicineId",
  checkPermission("deleteMedicine"),
  storeKepperController.deleteMedicine
);

// EQUIPMENT
// Báo cáo thiết bị hỏng
router.post("/store/equipment/issues",
  checkPermission("reportEquipment"),
  storeKepperController.reportEquipment
);

router.get("/store/equipment",
  checkPermission("viewEquipment"),
  storeKepperController.viewEquipment
);
router.post("/store/equipment",
  checkPermission("createEquipment"),
  storeKepperController.createEquipment
);
router.put("/store/equipment/:equipmentId",
  checkPermission("updateEquipment"),
  storeKepperController.updateEquipment
);
router.delete("/store/equipment/:equipmentId",
  checkPermission("deleteEquipment"),
  storeKepperController.deleteEquipment
);



// Chỉnh sửa hồ sơ cá nhân (store keeper)
router.put("/store/profile",
  checkPermission("editOwnProfileStore"),
  storeKepperController.editOwnProfileStore
);


module.exports = router;