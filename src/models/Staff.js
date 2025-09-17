const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    permissions: {
      handlePrescriptions: {
        type: Boolean,
        default: false,
      },
      dispenseMedicines: {
        type: Boolean,
        default: false,
      },
      reportEquipment: {
        type: Boolean,
        default: false,
      },
      handleInvoices: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate user data when querying staff
staffSchema.pre(/^find/, function () {
  this.populate({
    path: "user",
    select: "fullName email phone role",
  });
});

module.exports = mongoose.model("Staff", staffSchema);
