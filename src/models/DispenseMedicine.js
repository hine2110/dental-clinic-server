const mongoose = require("mongoose");

const dispenseMedicineSchema = new mongoose.Schema(
  {
    dispenseId: { type: String },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: "Prescription", required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    dispenseDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["dispensed", "returned", "cancelled"],
      default: "dispensed"
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Calculate total price before saving
dispenseMedicineSchema.pre('save', function(next) {
  this.totalPrice = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model("DispenseMedicine", dispenseMedicineSchema);
