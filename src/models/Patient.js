const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    emergencyContact: { type: String, trim: true },
    medicalHistory: { type: String, trim: true },
    insuranceInfo: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);