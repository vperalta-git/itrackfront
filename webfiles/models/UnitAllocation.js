// models/UnitAllocation.js - for unit allocations to sales agents
const mongoose = require('mongoose');

const UnitAllocationSchema = new mongoose.Schema({
  unitName: { type: String, required: true },
  unitId: { type: String, required: true },
  bodyColor: String,
  variation: String,
  assignedAgent: { type: String, required: true }, // Sales agent name
  allocatedBy: String, // Manager/Admin who allocated
  allocationDate: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('UnitAllocation', UnitAllocationSchema, 'unitallocations');
