const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth");
const { createAccount } = require("../controllers/adminControllers");

router.post("/create-account", authenticate, authorize("admin"), createAccount);

module.exports = router;
