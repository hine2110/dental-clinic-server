const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { 
      type: String, 
      unique: true,
      default: function() {
        return 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    recipients: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      refPath: "recipientModel" // Dynamic reference
    }], // Có thể gửi cho nhiều người
    recipientModel: {
      type: String,
      enum: ["User", "Doctor", "Staff"],
      default: "User"
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "schedule_update", 
        "equipment_report", 
        "general", 
        "urgent",
        "doctor_schedule_assigned",
        "staff_schedule_assigned", 
        "appointment_updated",
        "appointment_booked"
      ],
      default: "general"
    },
    isRead: { type: Boolean, default: false },
    readBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      readAt: { type: Date, default: Date.now }
    }],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    relatedData: {
      scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "DoctorSchedule" },
      staffScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "StaffSchedule" },
      appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
      issueId: { type: mongoose.Schema.Types.ObjectId, ref: "EquipmentIssue" },
      scheduleType: { type: String, enum: ["doctor", "staff"] },
      location: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
      assignedPerson: { type: mongoose.Schema.Types.ObjectId },
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
      doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
