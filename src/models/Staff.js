const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    staffType: {
      type: String,
      enum: ["receptionist", "cashier", "general"],
      default: "general"
    },
    permissions: {
      // Receptionist permissions
      manageDoctorSchedule: { type: Boolean, default: false },
      acceptPatientBooking: { type: Boolean, default: false },
      sendNotifications: { type: Boolean, default: false },
      
      // Cashier permissions
      handlePrescriptions: { type: Boolean, default: false },
      dispenseMedicines: { type: Boolean, default: false },
      handleInvoices: { type: Boolean, default: false },
      
      // General permissions
      reportEquipment: { type: Boolean, default: false },
      viewInventory: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
