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
    isActive: { type: Boolean, default: true }
    // Dấu } thừa đã được xóa ở đây
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);