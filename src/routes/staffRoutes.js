const express = require("express");
const router = express.Router();
const receptionistController = require("../controllers/receptionistStaffController");
const cashierController = require("../controllers/cashierStaffController");
const generalController = require("../controllers/generalStaffController");
const { authenticate } = require("../middlewares/auth");
const { checkStaffRole, checkPermission } = require("../middlewares/staff");

// Middleware xác thực cho tất cả routes staff
router.use(authenticate);
router.use(checkStaffRole);


// ==================== RECEPTIONIST ROUTES ====================

// Quản lý lịch làm việc của doctor
router.post("/schedules/doctors", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.manageDoctorSchedule
);

router.get("/schedules/doctors", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getDoctorSchedules
);

// Quản lý lịch làm việc của staff
router.post("/schedules/staff", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.manageStaffSchedule
);

router.get("/schedules/staff", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getStaffSchedules
);

// Thống kê lịch làm việc của Doctor
router.get("/schedules/stats/doctors", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getScheduleStatsDoctor
);

// Thống kê lịch làm việc của Staff
router.get("/schedules/stats/staff", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getScheduleStatsStaff
);

// Thống kê giờ làm việc của doctor
router.get("/schedules/doctors/working-hours", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getDoctorWorkingHours
);

// Thống kê giờ làm việc của staff
router.get("/schedules/staff/working-hours", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getStaffWorkingHours
);

// Kiểm tra giờ làm việc còn lại
router.get("/schedules/remaining-hours", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.checkRemainingWorkingHours
);

// Quản lý cơ sở (Location)
router.get("/locations", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.getLocations
);

router.post("/locations", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.createLocation
);

router.put("/locations/:locationId", 
  checkPermission("manageDoctorSchedule"),
  receptionistController.updateLocation
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