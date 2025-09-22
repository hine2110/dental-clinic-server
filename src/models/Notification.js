const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, unique: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    recipients: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }], // Có thể gửi cho nhiều người
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["schedule_update", "equipment_report", "general", "urgent"],
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
      issueId: { type: mongoose.Schema.Types.ObjectId, ref: "EquipmentIssue" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
