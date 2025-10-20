const mongoose = require('mongoose');
const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Discount code is required'], 
      unique: true, 
      trim: true, 
      uppercase: true, 
    },
    description: {
      type: String,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [1, 'Discount must be at least 1%'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    maxUsage: {
      type: Number,
      default: null, 
    },
    usageCount: {
      type: Number,
      default: 0, 
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'], 
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],   
    },
    isActive: {
      type: Boolean,
      default: true
    },
  },
  {
    timestamps: true, 
  }
);
const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;