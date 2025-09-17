const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      unique: true,
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor is required"],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    serviceId: {
      type: String,
      required: [true, "Service ID is required"],
      trim: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorSchedule",
      required: [true, "Schedule is required"],
    },
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
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
    type: {
      type: String,
      enum: ["consultation", "cleaning", "treatment", "surgery"],
      required: [true, "Appointment type is required"],
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled"],
      default: "scheduled",
    },
    reasonForVisit: {
      type: String,
      required: [true, "Reason for visit is required"],
      trim: true,
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount must be positive"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate appointment ID before saving
appointmentSchema.pre("save", async function (next) {
  if (!this.appointmentId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const count = await this.constructor.countDocuments({
      appointmentId: new RegExp(`^APT${year}${month}`),
    });
    this.appointmentId = `APT${year}${month}${String(count + 1).padStart(
      4,
      "0"
    )}`;
  }
  next();
});

// Populate patient, doctor and schedule data when querying appointments
appointmentSchema.pre(/^find/, function () {
  this.populate({
    path: "patient",
    populate: {
      path: "user",
      select: "fullName email phone",
    },
  })
    .populate({
      path: "doctor",
      populate: {
        path: "user",
        select: "fullName email phone",
      },
    })
    .populate({
      path: "schedule",
      select: "date startTime endTime isAvailable",
    });
});

// Virtual for patient name (denormalized for performance)
appointmentSchema.virtual("patientName").get(function () {
  return this.patient?.user?.fullName || "Unknown Patient";
});

// Virtual for doctor name (denormalized for performance)
appointmentSchema.virtual("doctorName").get(function () {
  return this.doctor?.user?.fullName || "Unknown Doctor";
});

// Virtual for appointment duration in minutes
appointmentSchema.virtual("duration").get(function () {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(":").map(Number);
    const [endHour, endMin] = this.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes - startMinutes;
  }
  return null;
});

// Index for efficient queries
appointmentSchema.index({ appointmentDate: 1, doctor: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
