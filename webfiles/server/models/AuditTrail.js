const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'create', 'update', 'delete', 'login', etc.
  resource: { type: String, required: true }, // e.g., 'User', 'Inventory', etc.
  resourceId: { type: String }, // ID of the affected resource
  performedBy: { type: String, required: true }, // user id or name
  details: { type: Object }, // any extra info (before/after, etc.)
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditTrail', auditTrailSchema);
