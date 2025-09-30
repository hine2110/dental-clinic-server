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

// Xem lịch bác sĩ
router.get("/receptionist/schedules/doctors",
  checkPermission("viewReceptionistSchedule"),
  receptionistController.getDoctorSchedules
);

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

// Thu tiền cọc
router.post("/receptionist/appointments/:appointmentId/deposit",
  checkPermission("processDeposit"),
  receptionistController.processDeposit
);

// Gửi hóa đơn theo prescription
router.post("/receptionist/invoices/send",
  checkPermission("sendInvoice"),
  receptionistController.sendInvoice
);

// Chấp nhận đặt lịch của bệnh nhân
router.put("/receptionist/appointments/:appointmentId/accept",
  checkPermission("acceptPatientBooking"),
  receptionistController.acceptPatientBooking
);

// Xem danh sách lịch hẹn chờ duyệt
router.get("/receptionist/appointments/pending",
  checkPermission("acceptPatientBooking"),
  receptionistController.getPendingAppointments
);

// Xem danh sách lịch hẹn (tất cả)
router.get("/receptionist/appointments",
  checkPermission("acceptPatientBooking"),
  receptionistController.getAppointments
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

// Xuất thuốc theo đơn
router.post("/store/medicines/dispense",
  checkPermission("dispenseMedicines"),
  storeKepperController.dispenseMedicines
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

// Báo cáo thiết bị hỏng
router.post("/store/equipment/issues",
  checkPermission("reportEquipment"),
  storeKepperController.reportEquipment
);

// Chỉnh sửa hồ sơ cá nhân (store keeper)
router.put("/store/profile",
  checkPermission("editOwnProfileStore"),
  storeKepperController.editOwnProfileStore
);


module.exports = router;