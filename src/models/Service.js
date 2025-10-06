const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    thumbnail: { type: String }, 
    description: { type: String, trim: true },
    category: { type: String, trim: true, required: true },
    price: { type: Number, required: true, min: 0 },
    process: [{ 
      step: { type: Number, required: true },
      title: { type: String, trim: true, required: true },
      description: { type: String, trim: true, required: true }
    }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);