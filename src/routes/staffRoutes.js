const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/staffControllers/receptionistStaffController");
const cashierController = require("../controllers/staffControllers/cashierStaffController");
const generalController = require("../controllers/staffControllers/generalStaffController");
const { authenticate } = require("../middlewares/auth");
const { checkStaffRole, checkPermission } = require("../middlewares/staff");

// Middleware xác thực cho tất cả routes staff
router.use(authenticate);
router.use(checkStaffRole);


// ==================== RECEPTIONIST ROUTES ====================

// Quản lý lịch làm việc của doctor
router.post("/schedules", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.manageDoctorSchedule
);

router.get("/schedules", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getDoctorSchedules
);

// Chấp nhận đặt lịch của bệnh nhân
router.put("/appointments/:appointmentId/accept", 
  checkPermission("acceptPatientBooking"),
  receptionistController.acceptPatientBooking
);

// Xem danh sách lịch hẹn chờ duyệt
router.get("/appointments/pending", 
  checkPermission("acceptPatientBooking"),
  receptionistController.getPendingAppointments
);

// Xem danh sách lịch hẹn (tất cả)
router.get("/appointments", 
  checkPermission("acceptPatientBooking"),
  receptionistController.getAppointments
);

// ==================== CASHIER ROUTES ====================

// Quản lý đơn thuốc
router.get("/prescriptions", 
  checkPermission("handlePrescriptions"),
  cashierController.getPrescriptions
);

router.get("/prescriptions/:prescriptionId", 
  checkPermission("handlePrescriptions"),
  cashierController.getPrescriptionDetail
);

// Bóc thuốc từ kho
router.post("/medicines/dispense", 
  checkPermission("dispenseMedicines"),
  cashierController.dispenseMedicine
);

router.get("/medicines", 
  checkPermission("dispenseMedicines"),
  cashierController.getAvailableMedicines
);

// Tạo hóa đơn
router.post("/invoices", 
  checkPermission("handleInvoices"),
  cashierController.createInvoice
);

// Xử lý thanh toán hóa đơn
router.post("/invoices/:invoiceId/payment", 
  checkPermission("handleInvoices"),
  cashierController.processPayment
);

// Xem danh sách hóa đơn
router.get("/invoices", 
  checkPermission("handleInvoices"),
  cashierController.getInvoices
);

// ==================== GENERAL ROUTES ====================

// Báo cáo thiết bị hỏng
router.post("/equipment/issues", 
  checkPermission("reportEquipment"),
  generalController.reportEquipmentIssue
);

router.get("/equipment/issues", 
  checkPermission("reportEquipment"),
  generalController.getEquipmentIssues
);

router.put("/equipment/issues/:issueId", 
  checkPermission("reportEquipment"),
  generalController.updateEquipmentIssue
);

// Xem danh sách thiết bị
router.get("/equipment", 
  checkPermission("reportEquipment"),
  generalController.getEquipment
);

router.get("/equipment/:equipmentId", 
  checkPermission("reportEquipment"),
  generalController.getEquipmentDetail
);

// Xem tồn kho thuốc
router.get("/inventory", 
  checkPermission("viewInventory"),
  generalController.getInventory
);

router.get("/inventory/stats", 
  checkPermission("viewInventory"),
  generalController.getInventoryStats
);

router.get("/inventory/:medicineId", 
  checkPermission("viewInventory"),
  generalController.getMedicineDetail
);

module.exports = router;