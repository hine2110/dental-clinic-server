const mongoose = require("mongoose");

const equipmentIssueSchema = new mongoose.Schema(
  {
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
    issueDescription: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["reported", "under_review", "in_repair", "resolved", "rejected"],
      default: "reported"
    },
    adminNotes: { type: String, trim: true },
    estimatedRepairCost: { type: Number },
    actualRepairCost: { type: Number },
    repairDate: { type: Date },
    resolvedDate: { type: Date },
    images: [{ type: String }], // URLs to uploaded images
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EquipmentIssue", equipmentIssueSchema);
