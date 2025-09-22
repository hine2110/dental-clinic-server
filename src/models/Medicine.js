const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    medicineId: { type: String, unique: true },
    name: { type: String, trim: true, required: true },
    category: { type: String, trim: true },
    dosageForm: { type: String, trim: true },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 10 }, // Cảnh báo khi hết thuốc
    price: { type: Number, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
