// routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

router.get('/vehicle-stocks', async (req, res) => {
  try {
    const stocks = await Inventory.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/vehicle-stocks', async (req, res) => {
  try {
    const stock = new Inventory(req.body);
    await stock.save();
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
