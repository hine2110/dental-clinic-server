const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment reference is required']
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient reference is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor reference is required']
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  services: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    }
  }],
  medicines: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    }
  }],
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      rate: { type: Number, default: 10, min: 0, max: 100 },
      amount: { type: Number, default: 0, min: 0 }
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  },
  paymentInfo: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'credit-card', 'debit-card', 'bank-transfer', 'insurance', 'installment'],
      default: 'cash'
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: [0, 'Remaining amount cannot be negative']
    },
    paymentDate: { type: Date },
    transactionId: { type: String, trim: true },
    installmentPlan: {
      totalInstallments: { type: Number, min: 1 },
      installmentAmount: { type: Number, min: 0 },
      paidInstallments: { type: Number, default: 0, min: 0 },
      nextDueDate: { type: Date }
    }
  },
  insurance: {
    provider: { type: String, trim: true },
    claimNumber: { type: String, trim: true },
    claimStatus: {
      type: String,
      enum: ['not-submitted', 'submitted', 'processing', 'approved', 'denied', 'partial'],
      default: 'not-submitted'
    },
    claimAmount: { type: Number, min: 0, default: 0 },
    approvedAmount: { type: Number, min: 0, default: 0 },
    patientResponsibility: { type: Number, min: 0, default: 0 }
  },
  notes: {
    doctorNotes: { type: String, trim: true },
    staffNotes: { type: String, trim: true },
    paymentNotes: { type: String, trim: true }
  },
  documents: {
    receiptUrl: { type: String },
    invoicePdfUrl: { type: String },
    insuranceFormUrl: { type: String }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate invoice ID before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceId) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      invoiceId: new RegExp(`^INV${year}${month}`)
    });
    this.invoiceId = `INV${year}${month}${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals before saving
  this.calculateTotals();
  next();
});

// Method to calculate invoice totals
invoiceSchema.methods.calculateTotals = function() {
  // Calculate services subtotal
  const servicesSubtotal = this.services.reduce((total, item) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    item.subtotal = (item.unitPrice * item.quantity) - discountAmount;
    return total + item.subtotal;
  }, 0);

  // Calculate medicines subtotal
  const medicinesSubtotal = this.medicines.reduce((total, item) => {
    item.subtotal = item.unitPrice * item.quantity;
    return total + item.subtotal;
  }, 0);

  this.totals.subtotal = servicesSubtotal + medicinesSubtotal;
  this.totals.tax.amount = (this.totals.subtotal * this.totals.tax.rate) / 100;
  this.totals.total = this.totals.subtotal + this.totals.tax.amount - this.totals.discount;
  
  // Update remaining amount
  this.paymentInfo.remainingAmount = this.totals.total - this.paymentInfo.paidAmount;
};

// Virtual for payment status
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.paymentInfo.status === 'paid') return false;
  return new Date() > this.dueDate;
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Populate references when querying
invoiceSchema.pre(/^find/, function() {
  this.populate([
    { path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone' } },
    { path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } },
    { path: 'services.service', select: 'name category price' },
    { path: 'medicines.medicine', select: 'name strength pricing' },
    { path: 'createdBy processedBy lastModifiedBy', select: 'firstName lastName role' }
  ]);
});

// Index for efficient queries
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ patient: 1, invoiceDate: -1 });
invoiceSchema.index({ 'paymentInfo.status': 1, dueDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
