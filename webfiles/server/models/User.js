const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Basic Authentication Fields
  username: String,
  name: String,
  accountName: String,
  password: String,
  email: String,
  role: String,
  
  // Contact Information
  phoneNumber: String,
  phoneno: String, // Keep for backward compatibility
  secondaryPhone: String,
  
  // Profile Information
  profilePicture: String, // URL or base64 string
  bio: String,
  
  // Employment Information
  employeeId: String,
  department: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'users' }, // Manager assignment
  
  // Emergency Contact
  emergencyContact: String,
  emergencyPhone: String,
  
  // Address
  address: String,
  
  // System Information
  dateJoined: { type: Date, default: Date.now },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Temporary Password (for forgot password feature)
  temporaryPassword: String,
  temporaryPasswordExpires: Date,
  
  // Additional Metadata
  createdBy: String,
  updatedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const UserModel = mongoose.model("users", UserSchema);
module.exports = UserModel;

