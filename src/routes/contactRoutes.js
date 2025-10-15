const express = require("express");
const router = express.Router();
const { 
  handleContactSubmission, 
  getAllContacts, 
  replyToContact 
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

// PATCH /api/contact/:contactId/reply
router.patch(
  "/:contactId/reply", 
  authenticate, 
  checkStaffRole,
  checkStaffType('receptionist'), 
  replyToContact
);

module.exports = router;