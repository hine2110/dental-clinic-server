const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    maxlength: [100, 'Medicine name cannot exceed 100 characters']
  },
  genericName: {
    type: String,
    trim: true,
    maxlength: [100, 'Generic name cannot exceed 100 characters']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'antibiotic',
      'painkiller',
      'anti-inflammatory', 
      'anesthetic',
      'antiseptic',
      'vitamin',
      'supplement',
      'mouth-wash',
      'fluoride',
      'other'
    ],
    required: [true, 'Medicine category is required']
  },
  dosageForm: {
    type: String,
    enum: ['tablet', 'capsule', 'liquid', 'gel', 'cream', 'injection', 'spray'],
    required: [true, 'Dosage form is required']
  },
  strength: {
    value: { type: Number, required: true },
    unit: { 
      type: String, 
      enum: ['mg', 'g', 'ml', 'mcg', '%'],
      required: true 
    }
  },
  inventory: {
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    minimumStock: {
      type: Number,
      required: [true, 'Minimum stock level is required'],
      min: [0, 'Minimum stock cannot be negative'],
      default: 10
    },
    unit: {
      type: String,
      enum: ['pieces', 'bottles', 'boxes', 'tubes'],
      default: 'pieces'
    }
  },
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    currency: {
      type: String,
      default: 'VND'
    }
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  batchNumber: {
    type: String,
    trim: true
  },
  storage: {
    conditions: { type: String, trim: true },
    temperature: { type: String, trim: true },
    humidity: { type: String, trim: true }
  },
  usage: {
    indications: [{ type: String, trim: true }],
    contraindications: [{ type: String, trim: true }],
    sideEffects: [{ type: String, trim: true }],
    dosageInstructions: { type: String, trim: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isControlled: {
    type: Boolean,
    default: false
  },
  supplier: {
    name: { type: String, trim: true },
    contact: { type: String, trim: true },
    email: { type: String, trim: true }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Generate medicine ID before saving
medicineSchema.pre('save', async function(next) {
  if (!this.medicineId) {
    const count = await this.constructor.countDocuments();
    this.medicineId = `MED${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for stock status
medicineSchema.virtual('stockStatus').get(function() {
  if (this.inventory.currentStock === 0) return 'out-of-stock';
  if (this.inventory.currentStock <= this.inventory.minimumStock) return 'low-stock';
  return 'in-stock';
});

// Virtual for days until expiry
medicineSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for expiry status
medicineSchema.virtual('expiryStatus').get(function() {
  const daysLeft = this.daysUntilExpiry;
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring-soon';
  return 'valid';
});

// Index for efficient searches
medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ category: 1, isActive: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ 'inventory.currentStock': 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
