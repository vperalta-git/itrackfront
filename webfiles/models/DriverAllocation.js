// models/DriverAllocation.js (for driverallocations collection)
const mongoose = require('mongoose');

const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,      // important: use unitId not conductionNumber
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  assignedAgent: String,
  status: String,
  allocatedBy: String,

  // REAL LOCATION TRACKING - NO MORE MOCK DATA
  currentLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    address: String,
    lastUpdated: { type: Date, default: Date.now }
  },
  // REAL DELIVERY DESTINATION (e.g., Isuzu Pasig)
  deliveryDestination: {
    latitude: { type: Number, min: -90, max: 90, default: 14.5791 }, // Isuzu Pasig
    longitude: { type: Number, min: -180, max: 180, default: 121.0655 }, // Isuzu Pasig
    address: { type: String, default: 'Isuzu Pasig Dealership, Metro Manila' },
    contactPerson: String,
    contactNumber: String
  },
  // REAL PICKUP LOCATION
  pickupLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    address: String,
    contactPerson: String,
    contactNumber: String
  },
  // GPS TRACKING HISTORY
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now },
    speed: Number,
    heading: Number
  }],
  // ROUTE INFORMATION
  routeInfo: {
    distance: Number, // in meters
    estimatedDuration: Number, // in seconds
    actualDuration: Number, // in seconds
    routeStarted: Date,
    routeCompleted: Date
  },
  // Vehicle Process Management
  requestedProcesses: [{
    type: String,
    enum: ['delivery_to_isuzu_pasig', 'tinting', 'carwash', 'ceramic_coating', 'accessories', 'rust_proof', 'stock_integration', 'documentation_check']
  }],

  processStatus: {
    delivery_to_isuzu_pasig: { type: Boolean, default: false },
    tinting: { type: Boolean, default: false },
    carwash: { type: Boolean, default: false },
    ceramic_coating: { type: Boolean, default: false },
    accessories: { type: Boolean, default: false },
    rust_proof: { type: Boolean, default: false }
  },

  processCompletedBy: {
    delivery_to_isuzu_pasig: String,
    tinting: String,
    carwash: String,
    ceramic_coating: String,
    accessories: String,
    rust_proof: String
  },

  processCompletedAt: {
    delivery_to_isuzu_pasig: Date,
    tinting: Date,
    carwash: Date,
    ceramic_coating: Date,
    accessories: Date,
    rust_proof: Date
  },

  // Overall status
  overallProgress: {
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: false }
  },

  readyForRelease: { type: Boolean, default: false },
  releasedAt: Date,
  releasedBy: String
}, { timestamps: true });

module.exports = mongoose.model('DriverAllocation', DriverAllocationSchema, 'driverallocations');
