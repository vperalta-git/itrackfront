const mongoose = require('mongoose');

const testDriveSchema = new mongoose.Schema({
  // Request Information
  requestId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'TD' + Date.now() + Math.floor(Math.random() * 1000)
  },
  
  // Agent Information
  agentName: {
    type: String,
    required: true,
    trim: true
  },
  agentId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Customer Information
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true
  },
  customerLicense: {
    type: String,
    required: true,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  
  // Vehicle Preferences
  requestedVehicle: {
    unitId: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    }
  },
  alternativeVehicles: [{
    unitId: String,
    model: String,
    type: String
  }],
  
  // Schedule Preferences
  preferredDate: {
    type: Date,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  alternativeDates: [{
    date: Date,
    time: String
  }],
  duration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  
  // Approved Schedule
  scheduledDate: {
    type: Date
  },
  scheduledTime: {
    type: String
  },
  scheduledVehicle: {
    unitId: String,
    model: String,
    type: String
  },
  scheduledDuration: {
    type: Number
  },
  
  // Route and Location
  pickupLocation: {
    type: String,
    default: 'Dealership Showroom'
  },
  route: {
    type: String,
    default: 'Standard city test drive route'
  },
  specialRequirements: [{
    type: String,
    trim: true
  }],
  
  // Status and Approval Workflow
  status: {
    type: String,
    enum: [
      'pending',      // Initial request submitted
      'reviewing',    // Under admin review
      'approved',     // Approved by admin
      'scheduled',    // Date and time scheduled
      'confirmed',    // Customer confirmed
      'in-progress',  // Test drive in progress
      'completed',    // Test drive completed
      'cancelled',    // Cancelled by customer/agent
      'rejected',     // Rejected by admin
      'no-show'       // Customer didn't show up
    ],
    default: 'pending'
  },
  
  // Admin/Supervisor Review
  reviewedBy: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  approvalNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Test Drive Execution
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  conductedBy: {
    type: String, // Driver/Agent who conducted the test drive
    trim: true
  },
  
  // Customer Feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    vehicleRating: {
      type: Number,
      min: 1,
      max: 5
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      trim: true
    },
    interestedInPurchase: {
      type: Boolean,
      default: false
    },
    followUpRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // Sales Follow-up
  leadStatus: {
    type: String,
    enum: ['hot', 'warm', 'cold', 'not-interested', 'converted'],
    default: 'warm'
  },
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String,
    trim: true
  },
  
  // Vehicle Condition Check
  preTestDriveCheck: {
    fuel: { type: String, enum: ['full', 'three-quarters', 'half', 'quarter', 'low'] },
    mileage: { type: Number },
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'needs-attention'] },
    notes: { type: String }
  },
  postTestDriveCheck: {
    fuel: { type: String, enum: ['full', 'three-quarters', 'half', 'quarter', 'low'] },
    mileage: { type: Number },
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'needs-attention'] },
    notes: { type: String },
    damageReported: { type: Boolean, default: false },
    damageDetails: { type: String }
  },
  
  // Insurance and Documentation
  insuranceCovered: {
    type: Boolean,
    default: true
  },
  licenseVerified: {
    type: Boolean,
    default: false
  },
  waiverSigned: {
    type: Boolean,
    default: false
  },
  documentsChecked: {
    type: Boolean,
    default: false
  },
  
  // Activity History
  history: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    },
    statusChange: {
      from: String,
      to: String
    }
  }],
  
  // Notifications
  notificationsSent: [{
    type: { type: String, enum: ['sms', 'email', 'push'] },
    recipient: String,
    message: String,
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' }
  }],
  
  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
testDriveSchema.index({ requestId: 1 });
testDriveSchema.index({ agentId: 1 });
testDriveSchema.index({ status: 1 });
testDriveSchema.index({ scheduledDate: 1 });
testDriveSchema.index({ customerPhone: 1 });
testDriveSchema.index({ 'requestedVehicle.unitId': 1 });
testDriveSchema.index({ createdAt: -1 });

// Virtual for formatted request ID
testDriveSchema.virtual('formattedRequestId').get(function() {
  return `TD-${this.requestId.slice(-6)}`;
});

// Virtual for customer full info
testDriveSchema.virtual('customerFullInfo').get(function() {
  return `${this.customerName} (${this.customerPhone})`;
});

// Method to add history entry
testDriveSchema.methods.addHistory = function(action, performedBy, notes, statusChange = null) {
  this.history.push({
    action,
    performedBy,
    notes,
    statusChange,
    timestamp: new Date()
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to update status with history
testDriveSchema.methods.updateStatus = function(newStatus, performedBy, notes = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  this.updatedAt = new Date();
  
  this.history.push({
    action: `Status changed to ${newStatus}`,
    performedBy,
    notes,
    statusChange: {
      from: oldStatus,
      to: newStatus
    },
    timestamp: new Date()
  });
  
  return this.save();
};

// Static method to get pending requests
testDriveSchema.statics.getPendingRequests = function() {
  return this.find({ 
    status: { $in: ['pending', 'reviewing'] } 
  }).sort({ createdAt: -1 });
};

// Static method to get upcoming test drives
testDriveSchema.statics.getUpcomingTestDrives = function() {
  return this.find({
    status: { $in: ['scheduled', 'confirmed'] },
    scheduledDate: { $gte: new Date() }
  }).sort({ scheduledDate: 1 });
};

// Static method to get agent's test drives
testDriveSchema.statics.getAgentTestDrives = function(agentId) {
  return this.find({ agentId }).sort({ createdAt: -1 });
};

// Pre-save middleware to update timestamps and generate request ID
testDriveSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate request ID if not exists
  if (!this.requestId) {
    this.requestId = 'TD' + Date.now() + Math.floor(Math.random() * 1000);
  }
  
  next();
});

// Pre-save middleware to add initial history entry
testDriveSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'Test Drive Request Created',
      performedBy: this.agentName,
      notes: `Request created for customer ${this.customerName}`,
      timestamp: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('TestDrive', testDriveSchema);