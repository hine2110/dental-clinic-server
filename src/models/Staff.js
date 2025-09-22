const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    permissions: {
      handlePrescriptions: { type: Boolean, default: false },
      dispenseMedicines: { type: Boolean, default: false },
      reportEquipment: { type: Boolean, default: false },
      handleInvoices: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
