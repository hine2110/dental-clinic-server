const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, unique: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    invoiceDate: { type: Date, default: Date.now },
    total: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance"],
      default: "cash",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
