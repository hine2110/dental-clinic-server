const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    medicineId: { type: String, unique: true },
    name: { type: String, trim: true },
    category: { type: String, trim: true },
    dosageForm: { type: String, trim: true },
    currentStock: { type: Number, default: 0 },
    price: { type: Number },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
