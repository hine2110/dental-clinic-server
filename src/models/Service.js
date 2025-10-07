const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    thumbnail: { type: String },
    image: {
      filename: { type: String },
      originalName: { type: String },
      path: { type: String },
      size: { type: Number },
      mimetype: { type: String },
    },
    description: { type: String, trim: true },
    category: { type: String, trim: true, required: true },
    price: { type: Number, required: true, min: 0 },
    process: [
      {
        step: { type: Number },
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);