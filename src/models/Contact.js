// src/models/Contact.js

const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Please enter your name"], 
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, "Please enter your email"], 
      lowercase: true,
      trim: true 
    },
    subject: { 
      type: String, 
      required: [true, "Please select a subject"],
      enum: [
        "Service Consultation",
        "Appointment Support",
        "Feedback/Complaints",
        "Other"
      ]
    },
    message: { 
      type: String, 
      required: [true, "Please enter your message"] 
    },
    status: {
      type: String,
      enum: ["new", "read", "replied", "archived"],
      default: "new",
    },
    replyMessage: {
      type: String,
      trim: true,
    },
    repliedAt: {
      type: Date,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);