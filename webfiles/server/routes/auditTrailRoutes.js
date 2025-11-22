const express = require('express');
const router = express.Router();
const AuditTrail = require('../models/AuditTrail');

// GET /api/audit-trail
router.get('/', async (req, res) => {
  try {
    const logs = await AuditTrail.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

module.exports = router;
