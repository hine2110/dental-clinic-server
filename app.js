// file: app.js (ĐÃ CẬP NHẬT)

const express = require("express");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();
const session = require("express-session");
const { webhook } = require("./src/controllers/stripeController");
const cron = require('node-cron');
const taskController = require('./src/controllers/taskController');

// BƯỚC 1: Import các module cần thiết
const http = require('http');
const socketService = require('./src/services/socket');

const connectDB = require("./src/config/database");

const app = express();

// BƯỚC 2: Tạo server HTTP và gắn Express app vào
const server = http.createServer(app);
// BƯỚC 3: Khởi tạo Socket.IO Server
const io = socketService.init(server);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ... (Toàn bộ phần Middleware và Routes của bạn giữ nguyên)
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), webhook);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 }}));
app.use(passport.initialize());
require("./src/controllers/googleController");

const authRoutes = require("./src/routes/authRoutes");
const staffRoutes = require("./src/routes/staffRoutes");
const managementRoutes = require("./src/routes/managementRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const patientRoutes = require("./src/routes/patientRoutes");
const doctorRoutes = require("./src/routes/doctorRoutes");
const stripeRoutes = require("./src/routes/stripeRoutes");
const rescheduleRoutes = require('./src/routes/rescheduleRoutes'); 
const contactRoutes = require('./src/routes/contactRoutes');

app.get("/", (req, res) => res.json({ message: "Dental Clinic Management API" }));
app.get("/health", (req, res) => res.status(200).json({ status: "OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/management", managementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/stripe", stripeRoutes);
app.use('/api/reschedule', rescheduleRoutes);
app.use('/api/contact', contactRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));
app.use((error, req, res, next) => {
  console.error("Error:", error.message);
  res.status(error.status || 500).json({ success: false, message: error.message || "Internal Server Error", ...(process.env.NODE_ENV === "development" && { stack: error.stack }) });
});

cron.schedule('* * * * *', () => {
  console.log('--- [CRON] Triggering scheduled task: updateOverdueAppointments ---');
  taskController.updateOverdueAppointments();
});

cron.schedule('* * * * *', () => {
  console.log('--- [CRON] Triggering scheduled task: updateOnHoldToNoShow ---');
  taskController.updateOnHoldToNoShow();
});

console.log('✅ Cron job for updating overdue appointments has been scheduled to run every minute.');

// BƯỚC 4: Lắng nghe kết nối từ client
io.on('connection', (socket) => {
  console.log('✅ A user connected via WebSocket');
  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});


// BƯỚC 5: Sửa lại app.listen thành server.listen
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

// BƯỚC 6: Export `io` để các file controller có thể sử dụng
module.exports = app;