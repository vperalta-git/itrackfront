const mongoose = require('mongoose');

const testDriveBookingSchema = new mongoose.Schema({
  // Customer Information
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  customerAddress: {
    type: String,
    trim: true,
    maxlength: 300
  },
  customerLicenseNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  customerAge: {
    type: Number,
    required: true,
    min: 18,
    max: 80
  },

  // Vehicle Information
  vehicleModel: {
    type: String,
    required: true,
    trim: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['Truck', 'SUV', 'Van', 'Bus', 'Commercial Vehicle', 'Other'],
    default: 'Truck'
  },
  vehicleColor: {
    type: String,
    trim: true
  },
  vehicleYear: {
    type: Number,
    min: 2000,
    max: new Date().getFullYear() + 2
  },
  vehiclePlateNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  vehicleVIN: {
    type: String,
    trim: true,
    uppercase: true
  },

  // Booking Details
  bookingDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Booking date must be in the future'
    }
  },
  bookingTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Please enter a valid time in HH:MM format'
    }
  },
  duration: {
    type: Number,
    required: true,
    min: 30,
    max: 180,
    default: 60 // minutes
  },
  testDriveRoute: {
    type: String,
    trim: true,
    enum: ['City Route', 'Highway Route', 'Mixed Route', 'Custom Route'],
    default: 'City Route'
  },

  // Status and Management
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  bookingReference: {
    type: String,
    unique: true,
    required: true
  },

  // Staff Assignment
  assignedSalesAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Additional Details
  specialRequests: {
    type: String,
    maxlength: 500
  },
  customerNotes: {
    type: String,
    maxlength: 500
  },
  internalNotes: {
    type: String,
    maxlength: 500
  },

  // Outcome Tracking
  testDriveOutcome: {
    type: String,
    enum: ['Interested', 'Very Interested', 'Not Interested', 'Needs Time', 'Follow-up Required'],
    required: false
  },
  followUpDate: {
    type: Date
  },
  leadScore: {
    type: Number,
    min: 1,
    max: 10
  },

  // Location Details
  pickupLocation: {
    type: String,
    enum: ['Dealership', 'Customer Location', 'Other'],
    default: 'Dealership'
  },
  customPickupAddress: {
    type: String,
    maxlength: 300
  },

  // Insurance and Verification
  insuranceVerified: {
    type: Boolean,
    default: false
  },
  licenseVerified: {
    type: Boolean,
    default: false
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['Not Required', 'Pending', 'Approved', 'Rejected'],
    default: 'Not Required'
  },

  // Timestamps and Tracking
  confirmedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    maxlength: 200
  },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastStatusUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
testDriveBookingSchema.index({ bookingDate: 1, bookingTime: 1 });
testDriveBookingSchema.index({ customerPhone: 1 });
testDriveBookingSchema.index({ customerEmail: 1 });
testDriveBookingSchema.index({ status: 1 });
testDriveBookingSchema.index({ assignedSalesAgent: 1 });
testDriveBookingSchema.index({ assignedDriver: 1 });
testDriveBookingSchema.index({ bookingReference: 1 });
testDriveBookingSchema.index({ vehicleModel: 1, vehicleType: 1 });
testDriveBookingSchema.index({ createdAt: -1 });

// Generate booking reference before saving
testDriveBookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingReference) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingReference = `TD-${dateStr}-${timeStr}-${randomStr}`;
  }
  
  // Update lastStatusUpdate when status changes
  if (this.isModified('status')) {
    this.lastStatusUpdate = new Date();
    
    // Set specific timestamp fields based on status
    if (this.status === 'Confirmed' && !this.confirmedAt) {
      this.confirmedAt = new Date();
    } else if (this.status === 'In Progress' && !this.startedAt) {
      this.startedAt = new Date();
    } else if (this.status === 'Completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'Cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
  
  next();
});

// Virtual for full customer name and contact
testDriveBookingSchema.virtual('customerContact').get(function() {
  return `${this.customerName} (${this.customerPhone})`;
});

// Virtual for booking datetime
testDriveBookingSchema.virtual('bookingDateTime').get(function() {
  return new Date(`${this.bookingDate.toISOString().split('T')[0]}T${this.bookingTime}:00`);
});

// Static method to find available time slots
testDriveBookingSchema.statics.findAvailableSlots = async function(date, duration = 60) {
  const startOfDay = new Date(date);
  startOfDay.setHours(8, 0, 0, 0); // 8 AM start
  
  const endOfDay = new Date(date);
  endOfDay.setHours(18, 0, 0, 0); // 6 PM end
  
  const existingBookings = await this.find({
    bookingDate: {
      $gte: startOfDay,
      $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $in: ['Pending', 'Confirmed', 'In Progress'] }
  }).sort({ bookingTime: 1 });
  
  const availableSlots = [];
  const timeSlots = [];
  
  // Generate 30-minute time slots from 8 AM to 6 PM
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }
  
  // Check which slots are available
  timeSlots.forEach(slot => {
    const slotTime = new Date(`${date}T${slot}:00`);
    const slotEndTime = new Date(slotTime.getTime() + duration * 60 * 1000);
    
    const hasConflict = existingBookings.some(booking => {
      const bookingStart = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.bookingTime}:00`);
      const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);
      
      return (slotTime < bookingEnd) && (slotEndTime > bookingStart);
    });
    
    if (!hasConflict) {
      availableSlots.push(slot);
    }
  });
  
  return availableSlots;
};

// Method to check if booking can be modified
testDriveBookingSchema.methods.canBeModified = function() {
  const now = new Date();
  const bookingDateTime = this.bookingDateTime;
  const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);
  
  return hoursDifference > 2 && ['Pending', 'Confirmed'].includes(this.status);
};

// Method to get status color for UI
testDriveBookingSchema.methods.getStatusColor = function() {
  const colors = {
    'Pending': '#FFA500',
    'Confirmed': '#4CAF50',
    'In Progress': '#2196F3',
    'Completed': '#8BC34A',
    'Cancelled': '#F44336',
    'No Show': '#9E9E9E'
  };
  return colors[this.status] || '#9E9E9E';
};

module.exports = mongoose.model('TestDriveBooking', testDriveBookingSchema);