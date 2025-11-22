const mongoose = require('mongoose');

const DriverallocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  status: String,
  date: Date,
  allocatedBy: String, // New field for tracking who allocated
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    lastUpdated: { type: Date, default: Date.now }
  },
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    address: String,
    customerName: String,
    contactNumber: String
  },
  // Completion tracking fields
  completedAt: Date, // When the delivery was marked as completed
  completedBy: String, // Driver name who completed the delivery
  completionTime: Date // Time when delivered (before marked as completed)
});

const DriverallocationModel = mongoose.model("driverallocation", DriverallocationSchema);
module.exports = DriverallocationModel;
