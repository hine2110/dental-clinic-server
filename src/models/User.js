const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "doctor", "staff", "patient"] },
    phone: { type: String },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    isActive: { type: Boolean, default: true },
    googleId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
