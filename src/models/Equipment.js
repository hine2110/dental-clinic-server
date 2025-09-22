const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    equipmentId: { type: String, unique: true },
    name: { type: String, trim: true },
    category: { type: String, trim: true },
    status: {
      type: String,
      enum: ["operational", "maintenance", "repair"],
      default: "operational",
    },
    location: { type: String, trim: true },
    purchaseDate: { type: Date },
    nextMaintenance: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
