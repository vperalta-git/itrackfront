const AuditTrail = require('../models/AuditTrail');

// Call this function after any action you want to log
async function logAudit({ action, resource, resourceId, performedBy, details }) {
  try {
    await AuditTrail.create({
      action,
      resource,
      resourceId,
      performedBy,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log audit trail:', err);
  }
}

module.exports = logAudit;
