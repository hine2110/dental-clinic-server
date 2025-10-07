const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    medications: [
      {
        medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
        quantity: { type: Number, required: true },
        dosage: { type: String, trim: true },
      },
    ],
    instructions: { type: String, trim: true },
    status: {
      type: String,
      enum: ["unfinished", "invoiced", "completed"],
      default: "unfinished",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
