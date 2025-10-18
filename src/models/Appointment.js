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
      enum: ["pending", "confirmed", "checked-in", "on-hold", "in-progress", "waiting-for-results", "cancelled", "completed", "no-show"],
      default: "pending",
    },

    reasonForVisit: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    
    // Medical examination fields
    physicalExamination: {
      vitalSigns: { type: String },
      generalAppearance: { type: String },
      oralExamination: { type: String },
      otherFindings: { type: String }
    },
    
    labTests: [{ type: String }],
    imagingTests: [{ type: String }],
    testInstructions: { type: String },
    testResults: { type: String },
    reExaminationFindings: { type: String },
    
    preliminaryDiagnosis: { type: String },
    differentialDiagnosis: { type: String },
    finalDiagnosis: { type: String },
    
    treatment: { type: String },
    procedures: [{ type: String }],
    followUpDate: { type: Date },
    followUpInstructions: { type: String },
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
    
    // Thời gian tạm hoãn để tự động chuyển sang no-show
    onHoldAt: {
      type: Date,
      default: null
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
