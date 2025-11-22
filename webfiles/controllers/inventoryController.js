const Inventory = require('../models/Inventory');

// Get all inventory items
exports.getStock = async (req, res) => {
  try {
    const inventory = await Inventory.find({}).sort({ createdAt: -1 });
    console.log(`� Found ${inventory.length} inventory items`);
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('❌ Get stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new inventory item
exports.createStock = async (req, res) => {
  try {
    const { unitName, unitId, bodyColor, variation, quantity, status } = req.body;
    
    // Validate status for new vehicle
    // Only 'In Stockyard' (default) or 'Available' are allowed when adding
    let vehicleStatus = 'In Stockyard'; // Default
    
    if (status) {
      if (status !== 'In Stockyard' && status !== 'Available') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status for new vehicle. Only "In Stockyard" or "Available" are allowed.' 
        });
      }
      vehicleStatus = status;
    }
    
    const newStock = new Inventory({
      unitName,
      unitId: unitId || `${unitName.replace(/\s+/g, '')}_${Date.now()}`,
      bodyColor,
      variation,
      quantity: quantity || 1,
      status: vehicleStatus
    });

    await newStock.save();
    console.log(`✅ Created stock: ${newStock.unitName} with status: ${newStock.status}`);
    res.json({ success: true, message: 'Stock created successfully', data: newStock });
  } catch (error) {
    console.error('❌ Create stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update inventory item
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get current stock item for validation
    const currentStock = await Inventory.findById(id);
    if (!currentStock) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stock item not found' 
      });
    }

    // Validate status transitions if status is being updated
    if (updates.status && updates.status !== currentStock.status) {
      const validationResult = validateStatusTransition(
        currentStock.status, 
        updates.status, 
        {
          hasDriver: !!currentStock.assignedDriver,
          driverAccepted: currentStock.driverAccepted,
          isAtIsuzu: currentStock.status === 'Available'
        }
      );

      if (!validationResult.isValid) {
        return res.status(400).json({ 
          success: false, 
          error: validationResult.error 
        });
      }
    }

    const updatedStock = await Inventory.findByIdAndUpdate(
      id, 
      { ...updates, lastUpdated: new Date() }, 
      { new: true, runValidators: true }
    );

    console.log(`✅ Updated stock: ${updatedStock.unitName} (${currentStock.status} → ${updatedStock.status})`);
    res.json({ 
      success: true, 
      message: 'Stock updated successfully', 
      data: updatedStock 
    });
  } catch (error) {
    console.error('❌ Update stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Status transition validation helper
const validateStatusTransition = (currentStatus, newStatus, context) => {
  const { hasDriver, driverAccepted, isAtIsuzu } = context;

  // Cannot manually set to 'Released' - only via Release button
  if (newStatus === 'Released') {
    return { 
      isValid: false, 
      error: 'Cannot manually set status to "Released". Use the Release button in the Release screen.' 
    };
  }

  // 'Pending' requires assigned driver
  if (newStatus === 'Pending' && !hasDriver) {
    return { 
      isValid: false, 
      error: 'Cannot set status to "Pending" without an assigned driver.' 
    };
  }

  // 'In Transit' requires driver acceptance and previous status must be 'Pending'
  if (newStatus === 'In Transit') {
    if (currentStatus !== 'Pending') {
      return { 
        isValid: false, 
        error: 'Status can only be changed to "In Transit" from "Pending" status.' 
      };
    }
    if (!driverAccepted) {
      return { 
        isValid: false, 
        error: 'Driver must accept the allocation before changing status to "In Transit".' 
      };
    }
  }

  // 'Preparing' requires vehicle to be 'Available' at Isuzu Pasig
  if (newStatus === 'Preparing' && currentStatus !== 'Available') {
    return { 
      isValid: false, 
      error: 'Vehicle must be "Available" at Isuzu Pasig before it can be set to "Preparing".' 
    };
  }

  // Define allowed transitions
  const allowedTransitions = {
    'In Stockyard': ['Available'],
    'Available': ['Pending', 'Preparing'],
    'Pending': ['In Transit', 'Available'],
    'In Transit': ['Available'],
    'Preparing': ['Available', 'Released'],
    'Released': [] // No transitions from Released
  };

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus) && currentStatus !== newStatus) {
    return { 
      isValid: false, 
      error: `Invalid status transition from "${currentStatus}" to "${newStatus}".` 
    };
  }

  return { isValid: true };
};

// Delete inventory item
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStock = await Inventory.findByIdAndDelete(id);
    
    if (!deletedStock) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stock item not found' 
      });
    }

    console.log('✅ Deleted stock:', deletedStock.unitName);
    res.json({
      success: true,
      message: 'Stock deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};