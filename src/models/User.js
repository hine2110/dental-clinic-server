const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ["admin", "doctor", "receptionist", "patient"],
    },
    phone: {
      type: String,
    },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    googleId: {
      type: String,
      sparse: true, // Allow multiple null values
      unique: true,
    },
    avatar: { type: String },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
