const mongoose = require('mongoose');

const CompletedAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  status: String,
  allocatedBy: String // New field for tracking who allocated
}, { timestamps: true });

module.exports = mongoose.model('CompletedAllocation', CompletedAllocationSchema);
