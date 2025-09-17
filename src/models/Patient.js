const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emergencyContact: {
      type: String,
      required: [true, "Emergency contact is required"],
      trim: true,
    },
    medicalHistory: {
      type: String,
      trim: true,
    },
    insuranceInfo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate user data when querying patients
patientSchema.pre(/^find/, function () {
  this.populate({
    path: "user",
    select: "fullName email phone role",
  });
});

module.exports = mongoose.model("Patient", patientSchema);
