const mongoose = require("mongoose");

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor is required"],
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time format (HH:MM)",
      ],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time format (HH:MM)",
      ],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate doctor and staff data when querying schedules
doctorScheduleSchema.pre(/^find/, function () {
  this.populate({
    path: "doctor",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  }).populate({
    path: "staff",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  });
});

// Index for efficient queries
doctorScheduleSchema.index({ doctor: 1, date: 1 });
doctorScheduleSchema.index({ date: 1, isAvailable: 1 });

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
