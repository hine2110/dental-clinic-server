const mongoose = require("mongoose");

const staffScheduleSchema = new mongoose.Schema(
  {
    staff: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff", 
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
    // Thời gian nghỉ trưa cố định
    breakTime: {
      startTime: { type: String, default: "11:30" },
      endTime: { type: String, default: "13:00" }
    },
    // Người tạo lịch
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff", 
      required: true 
    }
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
staffScheduleSchema.index({ staff: 1, date: 1 });
staffScheduleSchema.index({ location: 1, date: 1 });
staffScheduleSchema.index({ date: 1, startTime: 1 });

// Virtual: tính số giờ làm việc (sử dụng utility function)
staffScheduleSchema.virtual('workingHours').get(function() {
  const { calculateWorkingHours } = require('../utils/timeValidation');
  return calculateWorkingHours(this.startTime, this.endTime);
});

module.exports = mongoose.model("StaffSchedule", staffScheduleSchema);
