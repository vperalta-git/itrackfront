// routes/driverallocationRoutes.js
const express = require('express');
const router = express.Router();
const DriverAllocation = require('../models/DriverAllocation');

router.get('/driver-allocations', async (req, res) => {
  try {
    const allocations = await DriverAllocation.find();
    res.json(allocations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/driver-allocations', async (req, res) => {
  try {
    const allocation = new DriverAllocation(req.body);
    await allocation.save();
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
