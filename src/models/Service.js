const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: [
      'consultation',
      'cleaning', 
      'treatment',
      'surgery',
      'orthodontics',
      'cosmetic',
      'emergency',
      'preventive',
      'restorative'
    ],
    required: [true, 'Service category is required']
  },
  price: {
    amount: {
      type: Number,
      required: [true, 'Service price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'VND'
    }
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Service duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requirements: {
    preparationInstructions: { type: String, trim: true },
    specialEquipment: [{ type: String, trim: true }],
    requiredSpecialization: [{
      type: String,
      enum: [
        'General Dentistry',
        'Orthodontics',
        'Endodontics',
        'Periodontics',
        'Oral Surgery',
        'Prosthodontics',
        'Pediatric Dentistry',
        'Oral Pathology',
        'Cosmetic Dentistry',
        'Implantology'
      ]
    }]
  },
  images: [{ type: String }], // URLs to service images
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

// Generate service ID before saving
serviceSchema.pre('save', async function(next) {
  if (!this.serviceId) {
    const count = await this.constructor.countDocuments();
    this.serviceId = `SV${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  return `${this.price.amount.toLocaleString()} ${this.price.currency}`;
});

// Index for efficient searches
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
