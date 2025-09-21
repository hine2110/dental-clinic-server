const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// User Schema
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "doctor", "receptionist", "patient"],
      required: true,
    },
    phone: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/dental_clinic"
    );
    console.log("✅ Connected to MongoDB");

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("👤 Admin already exists:");
      console.log("   📧 Email: admin@dentalclinic.com");
      console.log("   🔑 Password: admin123456");
      return;
    }

    // Create admin
    const admin = await User.create({
      fullName: "System Administrator",
      email: "admin@dentalclinic.com",
      password: "admin123456",
      role: "admin",
      phone: "0123456789",
    });

    console.log("🎉 Admin created successfully:");
    console.log("   📧 Email: admin@dentalclinic.com");
    console.log("   🔑 Password: admin123456");
    console.log("   👤 Role: admin");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

createAdmin();
