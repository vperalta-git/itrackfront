// routes/servicerequestRoutes.js
const express = require('express');
const router = express.Router();
const Servicerequest = require('../models/Servicerequest');

router.get('/vehicle-preparations', async (req, res) => {
  try {
    const requests = await Servicerequest.find();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/vehicle-preparations', async (req, res) => {
  try {
    const request = new Servicerequest(req.body);
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
