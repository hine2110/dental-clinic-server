// file: src/routes/contactRoutes.js (ĐÃ SỬA LỖI GÕ PHÍM)

const express = require("express");
const router = express.Router();
const { 
  handleContactSubmission, 
  getAllContacts, 
  replyToContact,
  getUnreadCount // <-- Tên đúng là `getUnreadCount`
} = require("../controllers/contactController");

const { authenticate } = require('../middlewares/auth');
const { checkStaffRole, checkStaffType } = require('../middlewares/staff');

// --- ROUTE FOR PATIENTS ---
router.post("/", handleContactSubmission);


// --- ROUTES FOR RECEPTIONIST STAFF ---
router.get(
  "/", 
  authenticate, 
  checkStaffRole,
  checkStaffType('receptionist'), 
  getAllContacts
);

router.patch(
  "/:contactId/reply", 
  authenticate, 
  checkStaffRole,
  checkStaffType('receptionist'), 
  replyToContact
);

router.get(
  '/unread-count', 
  authenticate,
  checkStaffRole,
  checkStaffType('receptionist'),
  getUnreadCount
);

module.exports = router;