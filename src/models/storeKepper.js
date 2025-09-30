const mongoose = require("mongoose");

const storeKeeperProfileSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", unique: true },

    employment: {
      position: { type: String, default: "StoreKeeper" },
      clinic: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date }
    },

    skills: [{ type: String, trim: true }], // ví dụ: "Inventory Management", "Medicine Handling"

    experience: [
      {
        position: { type: String, trim: true },
        clinic: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        description: { type: String, trim: true }
      }
    ],

    certifications: [
      {
        name: { type: String, trim: true },
        issuedBy: { type: String, trim: true },
        dateIssued: { type: Date },
        expirationDate: { type: Date }
      }
    ],

    biography: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreKeeperProfile", storeKeeperProfileSchema);
