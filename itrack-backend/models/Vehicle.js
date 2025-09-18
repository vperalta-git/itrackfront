const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    default: 'Isuzu'
  },
  year: {
    type: Number,
    required: true,
    min: 1990,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  chassisNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  engineNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'In Transit', 'Maintenance', 'Out of Service', 'Assigned'],
    default: 'Available'
  },
  
  // Location tracking
  currentLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Assignment information
  assignedTo: {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: {
      type: Date
    }
  },
  
  // Vehicle specifications
  specifications: {
    fuelType: {
      type: String,
      enum: ['Gasoline', 'Diesel', 'Hybrid', 'Electric'],
      default: 'Diesel'
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Manual'
    },
    capacity: {
      type: String, // e.g., "2 tons", "15 passengers"
      trim: true
    },
    mileage: {
      type: Number,
      default: 0
    }
  },
  
  // Maintenance information
  maintenance: {
    lastService: {
      type: Date
    },
    nextService: {
      type: Date
    },
    serviceInterval: {
      type: Number, // kilometers
      default: 10000
    }
  },
  
  // Registration and insurance
  registration: {
    registrationNumber: {
      type: String,
      trim: true
    },
    expiryDate: {
      type: Date
    }
  },
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    expiryDate: {
      type: Date
    }
  },
  
  // Activity tracking
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: {
      type: String
    }
  }],
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
vehicleSchema.index({ unitId: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ plateNumber: 1 });
vehicleSchema.index({ 'assignedTo.driver': 1 });
vehicleSchema.index({ 'assignedTo.agent': 1 });
vehicleSchema.index({ isActive: 1 });
vehicleSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

// Virtual for full vehicle identification
vehicleSchema.virtual('fullIdentification').get(function() {
  return `${this.brand} ${this.model} ${this.year} (${this.unitId})`;
});

// Method to update location
vehicleSchema.methods.updateLocation = function(latitude, longitude, address) {
  this.currentLocation = {
    latitude,
    longitude,
    address,
    lastUpdated: new Date()
  };
  return this.save();
};

// Method to add activity log entry
vehicleSchema.methods.logActivity = function(action, performedBy, details) {
  this.activityLog.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to find vehicles by status
vehicleSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true });
};

// Static method to find available vehicles
vehicleSchema.statics.findAvailable = function() {
  return this.find({ 
    status: 'Available', 
    isActive: true 
  });
};

// Pre-save middleware to update timestamps and log changes
vehicleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.logActivity('Vehicle Updated', this.updatedBy, 'Vehicle information modified');
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
