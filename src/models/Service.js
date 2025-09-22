const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceId: { type: String, unique: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    price: { type: Number },
    duration: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
