const mongoose = require("mongoose");

const managementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    staffType: {
      type: String,
      enum: ["management"],
      default: "management",
    },
    permissions: {
      // Scheduling permissions (management capabilities)
      createDoctorSchedule: { type: Boolean, default: false },
      createReceptionistSchedule: { type: Boolean, default: false },
      createStoreKepperSchedule: { type: Boolean, default: false },

      viewDoctorProfile: { type: Boolean, default: false },
      viewStaffProfile: { type: Boolean, default: false },

      viewDoctorSchedule: { type: Boolean, default: false },
      viewStaffSchedule: { type: Boolean, default: false },

      updateDoctorSchedule: { type: Boolean, default: false },
      updateStaffSchedule: { type: Boolean, default: false },

      deleteDoctorSchedule: { type: Boolean, default: false },
      deleteStaffSchedule: { type: Boolean, default: false },

      viewEquipmentDamageReports: { type: Boolean, default: false },
      updateEquipmentDamageReports: { type: Boolean, default: false },

      // Revenue analytics
      viewRevenueWeekly: { type: Boolean, default: false },
      viewRevenueMonthly: { type: Boolean, default: false },
      viewRevenueYearly: { type: Boolean, default: false },

      //location
      getAllLocations: { type: Boolean, default: false },
      createLocation: { type: Boolean, default: false },
      updateLocation: { type: Boolean, default: false },
      deleteLocation: { type: Boolean, default: false },
      viewLocation: { type: Boolean, default: false },
      
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Management", managementSchema);
