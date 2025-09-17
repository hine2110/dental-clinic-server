const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    license: {
      type: String,
      required: [true, "License is required"],
      trim: true,
    },
    specializations: {
      type: String,
      required: [true, "Specializations is required"],
      trim: true,
    },
    workSchedule: {
      type: String,
      required: [true, "Work schedule is required"],
      trim: true,
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: [0, "Consultation fee must be positive"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate user data when querying doctors
doctorSchema.pre(/^find/, function () {
  this.populate({
    path: "user",
    select: "fullName email phone role",
  });
});

module.exports = mongoose.model("Doctor", doctorSchema);
