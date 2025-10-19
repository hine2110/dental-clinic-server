const express = require("express");
const router = express.Router();
const managementController = require("../controllers/managementController");
const { authenticate } = require("../middlewares/auth");
const { checkManagementRole, checkManagementPermission } = require("../middlewares/management");

// Middleware xác thực và kiểm tra staff
router.use(authenticate);
router.use(checkManagementRole);

// Get all doctors and staff
router.get("/doctors",
  checkManagementPermission("viewDoctorProfile"),
  managementController.getAllDoctors
);

router.get("/staff",
  checkManagementPermission("viewStaffProfile"),
  managementController.getAllStaff
);

router.get("/locations",
  checkManagementPermission("getAllLocations"),
  managementController.getAllLocations
);

router.post("/locations",
  checkManagementPermission("createLocation"),
  managementController.createLocation
);

router.put("/locations/:locationId",
  checkManagementPermission("updateLocation"),
  managementController.updateLocation
);

router.delete("/locations/:locationId",
  checkManagementPermission("deleteLocation"),
  managementController.deleteLocation
);

// Profiles
router.get("/doctors/:doctorId/profile",
  checkManagementPermission("viewDoctorProfile"),
  managementController.getDoctorProfile
);

router.get("/staff/:staffId/profile",
  checkManagementPermission("viewStaffProfile"),
  managementController.getStaffProfile
);

// Doctor schedules CRUD with enforcement
router.get("/schedules/doctors",
  checkManagementPermission("viewDoctorSchedule"),
  managementController.getDoctorSchedules
);
router.post("/schedules/doctors",
  checkManagementPermission("createDoctorSchedule"),
  managementController.createDoctorSchedule
);
router.put("/schedules/doctors/:scheduleId",
  checkManagementPermission("updateDoctorSchedule"),
  managementController.updateDoctorSchedule
);
router.delete("/schedules/doctors/:scheduleId",
  checkManagementPermission("deleteDoctorSchedule"),
  managementController.deleteDoctorSchedule
);

// Staff schedules CRUD with enforcement (receptionist/storeKepper fulltime)
router.get("/schedules/staff",
  checkManagementPermission("viewStaffSchedule"),
  managementController.getStaffSchedules
);
// Explicit endpoints per staff type
router.post("/schedules/staff/receptionist",
  checkManagementPermission("createReceptionistSchedule"),
  managementController.createReceptionistSchedule
);
router.post("/schedules/staff/store-kepper",
  checkManagementPermission("createStoreKepperSchedule"),
  managementController.createStoreKepperSchedule
);
router.put("/schedules/staff/:scheduleId",
  checkManagementPermission("updateStaffSchedule"),
  managementController.updateStaffSchedule
);
router.delete("/schedules/staff/:scheduleId",
  checkManagementPermission("deleteStaffSchedule"),
  managementController.deleteStaffSchedule
);

// Equipment issues (view all)
router.get("/equipment/issues",
  checkManagementPermission("viewEquipmentDamageReports"),
  managementController.getAllEquipmentIssues
);

// Revenue
router.get("/revenue",
  checkManagementPermission("viewRevenueWeekly"), // at least one permission required
  managementController.getRevenue
);

module.exports = router;


