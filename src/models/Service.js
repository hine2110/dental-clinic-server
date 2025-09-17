const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Service category is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Price cannot be negative"],
    },
    duration: {
      type: Number, // in minutes
      required: [true, "Service duration is required"],
      min: [15, "Duration must be at least 15 minutes"],
    },
    isActive: {
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

// Generate service ID before saving
serviceSchema.pre("save", async function (next) {
  if (!this.serviceId) {
    const count = await this.constructor.countDocuments();
    this.serviceId = `SV${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Index for efficient searches
serviceSchema.index({ name: "text", description: "text" });
serviceSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model("Service", serviceSchema);
