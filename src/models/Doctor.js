const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    doctorId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    
    // Thông tin chuyên môn
    credentials: {
      medicalLicense: { type: String, trim: true },
      dentalLicense: { type: String, trim: true },
      certifications: [{
        name: { type: String, trim: true },
        issuedBy: { type: String, trim: true },
        dateIssued: { type: Date },
        expirationDate: { type: Date }
      }]
    },
    
    // Học vấn
    education: [{
      degree: { type: String, trim: true },
      institution: { type: String, trim: true },
      graduationYear: { type: Number },
      fieldOfStudy: { type: String, trim: true }
    }],
    
    // Chuyên khoa
    specializations: [{ type: String, trim: true }],
    
    // Kinh nghiệm
    experience: {
      yearsOfPractice: { type: Number, default: 0 },
      previousPositions: [{
        position: { type: String, trim: true },
        clinic: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String, trim: true }
      }]
    },
    
    // Thông tin cá nhân
    biography: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    
    // Trạng thái
    isAcceptingNewPatients: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    
    // Phí khám
    consultationFee: { type: Number, default: 0 },
    
    // Lịch làm việc định kỳ
    workSchedule: {
      monday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      tuesday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      wednesday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      thursday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      friday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      saturday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } },
      sunday: { startTime: String, endTime: String, isWorking: { type: Boolean, default: false } }
    },
    
    // Đánh giá
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    
    // Trạng thái khả dụng
    availability: {
      isOnline: { type: Boolean, default: false },
      lastSeen: { type: Date },
      status: { 
        type: String, 
        enum: ['available', 'busy', 'away', 'offline'], 
        default: 'offline' 
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);