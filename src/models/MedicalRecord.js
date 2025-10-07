const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    recordId: { 
      type: String, 
      unique: true,
      required: true 
    },
    
    // Thông tin cơ bản
    patient: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Patient", 
      required: true 
    },
    doctor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Doctor", 
      required: true 
    },
    appointment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Appointment" 
    },
    
    // Thông tin khám bệnh
    visitDate: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    
    // Triệu chứng chính
    chiefComplaint: { 
      type: String, 
      required: true,
      trim: true 
    },
    
    // Tiền sử bệnh hiện tại
    presentIllness: { 
      type: String, 
      trim: true 
    },
    
    // Khám lâm sàng
    clinicalExamination: {
      // Khám tổng quát
      generalAppearance: { type: String, trim: true },
      vitalSigns: {
        bloodPressure: { type: String, trim: true },
        heartRate: { type: Number },
        temperature: { type: Number },
        respiratoryRate: { type: Number }
      },
      
      // Khám răng miệng
      oralExamination: {
        teeth: {
          condition: { type: String, trim: true },
          missingTeeth: [{ type: String, trim: true }],
          filledTeeth: [{ type: String, trim: true }],
          decayedTeeth: [{ type: String, trim: true }]
        },
        gums: {
          condition: { type: String, trim: true },
          bleeding: { type: Boolean, default: false },
          swelling: { type: Boolean, default: false }
        },
        tongue: {
          condition: { type: String, trim: true },
          coating: { type: String, trim: true }
        },
        mucosa: {
          condition: { type: String, trim: true },
          lesions: [{ type: String, trim: true }]
        }
      },
      
      // Khám chuyên khoa
      dentalExamination: {
        occlusion: { type: String, trim: true },
        tmj: { type: String, trim: true },
        periodontal: { type: String, trim: true },
        endodontic: { type: String, trim: true },
        orthodontic: { type: String, trim: true }
      }
    },
    
    // Chẩn đoán
    diagnosis: {
      primary: { type: String, required: true, trim: true },
      secondary: [{ type: String, trim: true }],
      differential: [{ type: String, trim: true }]
    },
    
    // Kế hoạch điều trị
    treatmentPlan: {
      immediate: [{ type: String, trim: true }],
      shortTerm: [{ type: String, trim: true }],
      longTerm: [{ type: String, trim: true }],
      followUp: {
        nextVisit: { type: Date },
        interval: { type: String, trim: true },
        instructions: { type: String, trim: true }
      }
    },
    
    // Điều trị đã thực hiện
    treatmentPerformed: [{
      procedure: { type: String, required: true, trim: true },
      date: { type: Date, default: Date.now },
      notes: { type: String, trim: true },
      materials: [{ type: String, trim: true }],
      cost: { type: Number, default: 0 }
    }],
    
    // Hình ảnh và tài liệu
    attachments: [{
      type: { 
        type: String, 
        enum: ['xray', 'photo', 'document', 'other'],
        required: true 
      },
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      size: { type: Number },
      mimetype: { type: String },
      description: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Ghi chú bổ sung
    notes: { type: String, trim: true },
    
    // Trạng thái
    status: {
      type: String,
      enum: ['draft', 'completed', 'archived'],
      default: 'draft'
    },
    
    // Thông tin theo dõi
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    followUpNotes: { type: String, trim: true },
    
    // Tạo bởi
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Doctor", 
      required: true 
    },
    
    // Cập nhật lần cuối
    lastUpdatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Doctor" 
    }
  },
  { 
    timestamps: true 
  }
);

// Index để tối ưu query
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ recordId: 1 });
medicalRecordSchema.index({ status: 1 });

// Virtual để tính tuổi bệnh nhân tại thời điểm khám
medicalRecordSchema.virtual('patientAgeAtVisit').get(function() {
  if (!this.patient?.basicInfo?.dateOfBirth) return null;
  const visitDate = this.visitDate || new Date();
  const birthDate = new Date(this.patient.basicInfo.dateOfBirth);
  let age = visitDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = visitDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && visitDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save middleware để tạo recordId
medicalRecordSchema.pre('save', async function(next) {
  if (this.isNew && !this.recordId) {
    const count = await mongoose.model('MedicalRecord').countDocuments();
    this.recordId = `MR${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
