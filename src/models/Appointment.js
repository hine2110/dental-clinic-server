const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "DoctorSchedule" },
    appointmentDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked-in", "cancelled", "completed", "no-show"],
      default: "pending",
    },

    reasonForVisit: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    totalAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "service payment"],
      default: "pending",
    },
        // lay token de doi lich hen
    reschedule_token: {
      type: String,
      default: null
    },

  reschedule_token_expires_at: {
    type: Date,
    default: null
  },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
