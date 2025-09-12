const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'Manager', 'Sales Agent', 'Driver', 'Supervisor'],
    default: 'Sales Agent'
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  
  // Profile Enhancement Fields
  profilePicture: {
    type: String, // URL or base64 string
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  secondaryPhone: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  
  // Employment Information
  employeeId: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to manager
  },
  
  // Emergency Contact
  emergencyContact: {
    type: String,
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  
  // Address
  address: {
    type: String,
    maxlength: 300
  },
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Audit fields
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ assignedTo: 1 });
userSchema.index({ isActive: 1 });

// Update the updatedBy field on save
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || 'System';
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
