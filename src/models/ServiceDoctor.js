const mongoose = require("mongoose");

const serviceDoctorSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      trim: true,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: { 
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceDoctor", serviceDoctorSchema);