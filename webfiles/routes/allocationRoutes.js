const express = require('express');
const router = express.Router();
const DriverAllocation = require('../models/DriverAllocation');
const Inventory = require('../models/Inventory');

// Get all driver allocations
router.get('/getAllocation', async (req, res) => {
  try {
    const allocations = await DriverAllocation.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${allocations.length} allocations`);
    res.json({ success: true, data: allocations });
  } catch (error) {
    console.error('❌ Get allocations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Driver Allocation
router.post('/createAllocation', async (req, res) => {
  try {
    const { unitName, unitId, bodyColor, variation, assignedDriver, status, allocatedBy } = req.body;
    
    const newAllocation = new DriverAllocation({
      unitName,
      unitId,
      bodyColor,
      variation,
      assignedDriver,
      status: status || 'Pending',
      allocatedBy: allocatedBy || 'Admin',
      date: new Date()
    });

    await newAllocation.save();
    console.log('✅ Created allocation:', newAllocation.unitName);
    res.json({ success: true, message: 'Allocation created successfully', data: newAllocation });
  } catch (error) {
    console.error('❌ Create allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Stock/Inventory
router.get('/getStock', async (req, res) => {
  try {
    const inventory = await Inventory.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${inventory.length} inventory items`);
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('❌ Get stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Stock
router.post('/createStock', async (req, res) => {
  try {
    const { unitName, unitId, bodyColor, variation, quantity } = req.body;
    
    const newStock = new Inventory({
      unitName,
      unitId,
      bodyColor,
      variation,
      quantity: quantity || 1
    });

    await newStock.save();
    console.log('✅ Created stock item:', newStock.unitName);
    res.json({ success: true, message: 'Stock created successfully', data: newStock });
  } catch (error) {
    console.error('❌ Create stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update allocation process status
router.put('/updateAllocation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allocation = await DriverAllocation.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    console.log('✅ Updated allocation:', allocation.unitId);
    res.json({ success: true, data: allocation });
  } catch (error) {
    console.error('❌ Update allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete allocation
router.delete('/deleteAllocation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const allocation = await DriverAllocation.findByIdAndDelete(id);
    
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    console.log('✅ Deleted allocation:', allocation.unitId);
    res.json({ success: true, message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('❌ Delete allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;