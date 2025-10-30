// File: models/Appointment.js
// Đã thêm trường 'hasBeenRescheduled'

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
      // Thêm 'rescheduled' nếu bạn muốn phân biệt rõ hơn, nhưng 'cancelled' cũng đủ
      enum: ["pending", "confirmed", "checked-in", "on-hold", "in-progress", "waiting-for-results", "in-treatment", "cancelled", "completed", "no-show", "pending-payment" /*, "rescheduled" */],
      default: "pending",
    },

    reasonForVisit: { type: String, trim: true },
    diagnosis: { type: String, trim: true }, // Bạn có thể bỏ nếu không dùng

    // ... (Các trường từ Step 1 đến Step 5 giữ nguyên) ...
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

    // Các trường cũ hơn
    reExaminationFindings: { type: String }, // Có thể bỏ nếu không dùng
    totalAmount: { type: Number, default: 0 }, // Có thể bỏ nếu đã có Invoice
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "service payment"],
      default: "pending",
    },

    // === BẮT ĐẦU PHẦN THÊM MỚI ===
    // Trường này dùng để đánh dấu lịch hẹn đã bị đổi 1 lần
    hasBeenRescheduled: {
      type: Boolean,
      default: false
    },
    // === KẾT THÚC PHẦN THÊM MỚI ===

    // Token dùng để đổi lịch hẹn
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

appointmentSchema.index(
    { "createdAt": 1 }, // Dựa trên trường 'createdAt' (được tạo tự động bởi timestamps: true)
    {
        // GHI CHÚ: Hết hạn sau 15 phút (15 * 60 = 900 giây)
        // Bạn có thể đổi thành 10 phút (600) nếu muốn
        expireAfterSeconds: 900, 
        
        // GHI CHÚ: Chỉ xóa nếu tài liệu thỏa mãn điều kiện này
        partialFilterExpression: {
            status: "pending-payment" 
        }
    }
);

appointmentSchema.index(
    { 
        doctor: 1, 
        appointmentDate: 1, 
        startTime: 1 
    }, // Các trường cần kiểm tra trùng
    {
        unique: true, // Bắt buộc phải là DUY NHẤT
        
        // Chỉ áp dụng luật DUY NHẤT này cho các lịch hẹn "đang chiếm chỗ"
        partialFilterExpression: { 
            status: { $in: [
                'pending-payment', 
                'pending', 
                'confirmed', 
                'checked-in', 
                'in-progress'
            ]}
        }
    }
);

module.exports = mongoose.model("Appointment", appointmentSchema);