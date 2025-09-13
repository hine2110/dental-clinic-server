const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  equipmentId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true,
    maxlength: [100, 'Equipment name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: [
      'diagnostic', // X-ray, intraoral camera
      'treatment', // dental chair, handpieces
      'surgical', // surgical instruments
      'sterilization', // autoclave, UV sterilizer
      'safety', // protective equipment
      'laboratory', // lab equipment
      'furniture', // cabinets, stools
      'technology', // computers, software
      'emergency', // emergency equipment
      'other'
    ],
    required: [true, 'Equipment category is required']
  },
  model: {
    type: String,
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  serialNumber: {
    type: String,
    unique: true,
    required: [true, 'Serial number is required'],
    trim: true
  },
  purchaseInfo: {
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required']
    },
    cost: {
      type: Number,
      required: [true, 'Purchase cost is required'],
      min: [0, 'Cost cannot be negative']
    },
    supplier: {
      name: { type: String, trim: true },
      contact: { type: String, trim: true },
      email: { type: String, trim: true }
    },
    warrantyPeriod: {
      type: Number, // in months
      min: [0, 'Warranty period cannot be negative']
    },
    warrantyExpiry: { type: Date }
  },
  status: {
    type: String,
    enum: ['operational', 'maintenance', 'repair', 'out-of-service', 'disposed'],
    default: 'operational'
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
    default: 'excellent'
  },
  location: {
    room: { type: String, trim: true },
    floor: { type: String, trim: true },
    building: { type: String, trim: true }
  },
  maintenanceSchedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'monthly'
    },
    lastMaintenance: { type: Date },
    nextMaintenance: { type: Date }
  },
  maintenanceHistory: [{
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['routine', 'repair', 'calibration', 'cleaning', 'inspection'],
      required: true
    },
    description: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    performedBy: { type: String, trim: true },
    nextServiceDue: { type: Date }
  }],
  specifications: {
    dimensions: { type: String, trim: true },
    weight: { type: String, trim: true },
    powerRequirements: { type: String, trim: true },
    operatingConditions: { type: String, trim: true },
    capacity: { type: String, trim: true }
  },
  safety: {
    requiresTraining: { type: Boolean, default: false },
    safetyProtocols: [{ type: String, trim: true }],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },
  documents: {
    manual: { type: String }, // URL to manual
    certificate: { type: String }, // URL to certificate
    warranty: { type: String } // URL to warranty document
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportDate: { type: Date, default: Date.now },
    issueType: {
      type: String,
      enum: ['malfunction', 'damage', 'missing', 'maintenance-needed', 'safety-concern'],
      required: true
    },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open'
    },
    resolution: { type: String, trim: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedDate: { type: Date }
  }],
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

// Generate equipment ID before saving
equipmentSchema.pre('save', async function(next) {
  if (!this.equipmentId) {
    const count = await this.constructor.countDocuments();
    this.equipmentId = `EQ${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for warranty status
equipmentSchema.virtual('warrantyStatus').get(function() {
  if (!this.purchaseInfo.warrantyExpiry) return 'no-warranty';
  
  const today = new Date();
  const expiry = new Date(this.purchaseInfo.warrantyExpiry);
  
  if (expiry < today) return 'expired';
  
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return 'expiring-soon';
  
  return 'active';
});

// Virtual for maintenance status
equipmentSchema.virtual('maintenanceStatus').get(function() {
  if (!this.maintenanceSchedule.nextMaintenance) return 'not-scheduled';
  
  const today = new Date();
  const nextMaintenance = new Date(this.maintenanceSchedule.nextMaintenance);
  
  if (nextMaintenance < today) return 'overdue';
  
  const daysLeft = Math.ceil((nextMaintenance - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) return 'due-soon';
  
  return 'scheduled';
});

// Virtual for age in years
equipmentSchema.virtual('ageInYears').get(function() {
  const today = new Date();
  const purchaseDate = new Date(this.purchaseInfo.purchaseDate);
  return Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24 * 365.25));
});

// Index for efficient searches
equipmentSchema.index({ name: 'text', serialNumber: 'text' });
equipmentSchema.index({ category: 1, status: 1 });
equipmentSchema.index({ 'maintenanceSchedule.nextMaintenance': 1 });
equipmentSchema.index({ 'purchaseInfo.warrantyExpiry': 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);
