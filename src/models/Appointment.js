const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "DoctorSchedule" },
    appointmentDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked-in", "on-hold", "in-progress", "waiting-for-results", "in-treatment", "cancelled", "completed", "no-show"],
      default: "pending",
    },

    reasonForVisit: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    
    // Step 1: Clinical Examination
    chiefComplaint: { type: String },
    medicalHistory: { type: String },
    physicalExamination: {
      vitalSigns: { type: String },
      generalAppearance: { type: String },
      oralExamination: { type: String },
      occlusionExamination: { type: String },
      otherFindings: { type: String }
    },
    
    // Step 2: Paraclinical Tests
    labTests: [{ type: String }], // Legacy field
    imagingTests: [{ type: String }], // Legacy field
    testServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "ServiceDoctor" }], // Combined field
    testInstructions: { type: String },
    
    // Step 3: Diagnosis
    imagingResults: { type: String },
    labResults: { type: String },
    testResults: { type: String },
    testImages: [{ type: String }], // Danh sách URL hình ảnh kết quả xét nghiệm
    preliminaryDiagnosis: { type: String },
    differentialDiagnosis: { type: String },
    finalDiagnosis: { type: String },
    prognosis: { type: String },
    
    // Step 4: Treatment & Services
    selectedServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    treatmentNotes: { type: String },
    treatment: { type: String },
    procedures: [{ type: String }],
    homeCare: { type: String },
    
    // Step 5: Prescription & Follow-up
    prescriptions: [{
      medicine: { type: String },
      dosage: { type: String },
      frequency: { type: String },
      duration: { type: String },
      instructions: { type: String }
    }],
    followUpDate: { type: Date },
    followUpType: { type: String },
    followUpInstructions: { type: String },
    warnings: { type: String },
    
    // Legacy fields
    reExaminationFindings: { type: String },
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
