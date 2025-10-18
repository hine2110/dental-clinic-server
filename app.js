const express = require("express");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();
const session = require("express-session");
const { webhook } = require("./src/controllers/stripeController");
const cron = require('node-cron');
const taskController = require('./src/controllers/taskController');

const connectDB = require("./src/config/database");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Stripe webhook must be defined BEFORE any body parser (needs raw body)
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  webhook
);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
// ===========================================

// Passport middleware
app.use(passport.initialize());

// Import Google OAuth strategy
require("./src/controllers/googleController");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const managementRoutes = require("./src/routes/managementRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const patientRoutes = require("./src/routes/patientRoutes");
const doctorRoutes = require("./src/routes/doctorRoutes");
const stripeRoutes = require("./src/routes/stripeRoutes");
const rescheduleRoutes = require('./src/routes/rescheduleRoutes'); 

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Dental Clinic Management API" });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/management", managementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/stripe", stripeRoutes);
app.use('/api/reschedule', rescheduleRoutes);

// 404 handler - must be last before error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error.message);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// ==================== SCHEDULED TASKS (CRON JOB) ====================
// Tác vụ này sẽ chạy sau mỗi phút để tự động cập nhật lịch hẹn trễ.
// Cấu hình: '* * * * *' -> Chạy mỗi phút.
// Để chạy mỗi 5 phút, bạn có thể dùng: '*/5 * * * *'
cron.schedule('* * * * *', () => {
  console.log('--- [CRON] Triggering scheduled task: updateOverdueAppointments ---');
  taskController.updateOverdueAppointments();
});

cron.schedule('* * * * *', () => {
  console.log('--- [CRON] Triggering scheduled task: updateOnHoldToNoShow ---');
  taskController.updateOnHoldToNoShow();
});

console.log('✅ Cron job for updating overdue appointments has been scheduled to run every minute.');
console.log('✅ Cron job for auto no-show on-hold appointments has been scheduled to run every minute.');
// ====================================================================

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

module.exports = app;