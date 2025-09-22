const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, unique: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    medications: { type: String, trim: true },
    instructions: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "dispensed", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
