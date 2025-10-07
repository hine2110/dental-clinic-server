const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    invoiceDate: { type: Date, default: Date.now },
    total: { type: Number },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "insurance"],
      default: "cash",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
