const mongoose = require("mongoose");

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Doctor", 
      required: true 
    },
    location: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Location", 
      required: true 
    },
    date: { 
      type: Date, 
      required: true 
    },
    startTime: { 
      type: String, 
      required: true
    },
    endTime: { 
      type: String, 
      required: true
    },
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
    notes: { 
      type: String, 
      trim: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff", 
      required: true 
    },
    breakTime: {
      startTime: { type: String, default: "11:30" },
      endTime: { type: String, default: "13:00" }
    }
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
doctorScheduleSchema.index({ doctor: 1, date: 1 });
doctorScheduleSchema.index({ location: 1, date: 1 });
doctorScheduleSchema.index({ date: 1, startTime: 1 });

// Virtual: tính số giờ làm việc (sử dụng utility function)
doctorScheduleSchema.virtual('workingHours').get(function() {
  const { calculateWorkingHours } = require('../utils/timeValidation');
  return calculateWorkingHours(this.startTime, this.endTime);
});

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);
