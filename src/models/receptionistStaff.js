const mongoose = require("mongoose");

const receptionistProfileSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", unique: true },

    employment: {
      position: { type: String, default: "Receptionist" },
      clinic: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date }
    },

    education: [
      {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        graduationYear: { type: Number },
        fieldOfStudy: { type: String, trim: true }
      }
    ],

    skills: [{ type: String, trim: true }], // ví dụ: "Communication", "Scheduling", "Customer Service"

    experience: [
      {
        position: { type: String, trim: true },
        clinic: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String, trim: true }
      }
    ],

    biography: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReceptionistProfile", receptionistProfileSchema);
