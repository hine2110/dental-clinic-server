// src/models/Invoice.js
const mongoose = require("mongoose");
const itemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  priceAtPayment: {
    type: Number,
    required: true,
  },
  nameAtPayment: {
    type: String,
    required: true,
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, unique: true, sparse: true },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    items: [itemSchema], 

    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    discountCode: { 
      type: String, 
      default: null 
    },
    discountAmount: { 
      type: Number, 
      default: 0 
    },
    finalAmount: {
      type: Number, 
      default: 0 
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer", "insurance"],
    },
    invoiceDate: { type: Date }
  },
  { timestamps: true }
);
invoiceSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.priceAtPayment * item.quantity);
  }, 0);

  this.finalAmount = this.totalAmount - this.discountAmount;
  if (this.finalAmount < 0) {
    this.finalAmount = 0;
  }
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);