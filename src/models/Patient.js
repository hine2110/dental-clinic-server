const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      unique: true,
      required: true
    },
    
    // Thông tin cơ bản
    basicInfo: {
      fullName: { type: String, trim: true, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { 
        type: String, 
        enum: ["male", "female", "other"],
        required: true
      },
      
      //nhap cccd
      idCard: { 
        idNumber: { type: String, required: true },
      }
    },

    // Lịch sử bệnh án
    medicalHistory: [{ 
      condition: String, 
      year: Number, 
      notes: String 
    }],

    // Thuốc dị ứng
    allergies: [{ 
      allergen: String, 
      severity: String, 
      reaction: String 
    }],

    // Thông tin liên hệ
    contactInfo: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { 
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, default: "Viet Nam" }
      }
    },

    // Thông tin khẩn cấp
    emergencyContact: { 
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true }
    },

    // Thông tin bảo hiểm
    insuranceInfo: { 
      type: String, 
      trim: true 
    },
    
    // Trạng thái hoàn thành profile
    isProfileComplete: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  },
  { timestamps: true }
);

// Virtual để tính tuổi
patientSchema.virtual('age').get(function() {
  if (!this.basicInfo.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.basicInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Index để tối ưu query
patientSchema.index({ user: 1 });
patientSchema.index({ 'basicInfo.fullName': 1 });
patientSchema.index({ 'contactInfo.phone': 1 });
patientSchema.index({ 'contactInfo.email': 1 });

module.exports = mongoose.model("Patient", patientSchema);