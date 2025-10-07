const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["operational", "maintenance", "repair", "out_of_order"],
      default: "operational",
    },
    location: { type: String, trim: true },
    purchaseDate: { type: Date },
    nextMaintenance: { type: Date },
    warrantyExpiry: { type: Date },
    supplier: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
