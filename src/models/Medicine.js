const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true 
    },
    medicineId: { type: String },
    name: { type: String, trim: true, required: true },
    category: { type: String, trim: true },
    dosageForm: { type: String, trim: true },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 10 },
    price: { type: Number, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
  },
  { timestamps: true }
);
medicineSchema.index({ medicineId: 1, location: 1 }, { unique: true });
module.exports = mongoose.model("Medicine", medicineSchema);
