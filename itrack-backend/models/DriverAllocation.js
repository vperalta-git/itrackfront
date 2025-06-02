// models/DriverAllocation.js (for driverallocations collection)
const mongoose = require('mongoose');

const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,      // important: use unitId not conductionNumber
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('DriverAllocation', DriverAllocationSchema, 'driverallocations');
