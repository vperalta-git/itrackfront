const DriverAllocation = require('../models/DriverAllocation');
const User = require('../models/User');

// Get all allocations
exports.getAllocation = async (req, res) => {
  try {
    const { assignedDriver } = req.query;
    
    // Build query filter
    let query = {};
    if (assignedDriver) {
      query.assignedDriver = assignedDriver;
      console.log(`📊 Filtering allocations for driver: ${assignedDriver}`);
    }
    
    const allocations = await DriverAllocation.find(query).sort({ createdAt: -1 });
    console.log(`� Found ${allocations.length} driver allocations`);
    res.json({ success: true, data: allocations });
  } catch (error) {
    console.error('❌ Get allocations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new allocation
exports.createAllocation = async (req, res) => {
  try {
    const { 
      unitName, 
      unitId, 
      bodyColor, 
      variation, 
      assignedDriver, 
      assignedAgent,
      requestedProcesses,
      allocatedBy 
    } = req.body;

    if (!unitName || !assignedDriver) {
      return res.status(400).json({ 
        success: false, 
        message: 'Unit name and assigned driver are required' 
      });
    }

    console.log(`🚗 Creating allocation: ${unitName} -> ${assignedDriver}`);

    // Verify driver exists
    const driver = await User.findOne({ 
      username: assignedDriver.toLowerCase(),
      role: 'Driver',
      isActive: true 
    });

    if (!driver) {
      return res.status(400).json({ 
        success: false, 
        message: `Driver '${assignedDriver}' not found or not active` 
      });
    }

    // Check if vehicle is already assigned
    const existingAllocation = await DriverAllocation.findOne({ 
      unitId: unitId,
      status: { $in: ['In Progress', 'Assigned', 'Pending'] }
    });

    if (existingAllocation) {
      return res.status(400).json({ 
        success: false, 
        message: `Vehicle ${unitId} is already assigned` 
      });
    }

    const newAllocation = new DriverAllocation({
      unitName,
      unitId: unitId || `VIN_${Date.now()}`,
      bodyColor: bodyColor || 'Not Specified',
      variation: variation || 'Standard',
      assignedDriver: driver.username,
      assignedAgent: assignedAgent || null,
      requestedProcesses: requestedProcesses || ['delivery_to_isuzu_pasig'],
      status: 'Pending',
      allocatedBy: allocatedBy || 'Admin',
      date: new Date()
    });

    await newAllocation.save();
    
    console.log(`✅ Allocation created: ${unitName} assigned to ${driver.accountName}`);

    res.json({
      success: true,
      message: 'Allocation created successfully',
      data: newAllocation
    });
  } catch (error) {
    console.error('❌ Create allocation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create allocation',
      error: error.message 
    });
  }
};

// Get dispatch assignments (enhanced view)
exports.getDispatchAssignments = async (req, res) => {
  try {
    const { status, driver, dateRange } = req.query;
    let filter = {};

    // Apply status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Apply driver filter
    if (driver && driver !== 'all') {
      filter.assignedDriver = driver;
    }

    // Apply date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch(dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          filter.date = { $gte: startDate };
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          filter.date = { $gte: startDate };
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          filter.date = { $gte: startDate };
          break;
      }
    }

    const assignments = await DriverAllocation.find(filter).lean();
    
    console.log(`📊 Dispatch assignments: Found ${assignments.length} assignments`);
    
    res.json({
      success: true,
      data: assignments,
      total: assignments.length,
      filters: { status, driver, dateRange }
    });
  } catch (error) {
    console.error('❌ Get dispatch assignments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get dispatch assignments',
      error: error.message 
    });
  }
};

// Create dispatch assignment
exports.createDispatchAssignment = async (req, res) => {
  try {
    const { 
      unitName, 
      unitId, 
      bodyColor, 
      variation, 
      assignedDriver,
      requestedProcesses,
      priority = 'Normal',
      notes 
    } = req.body;

    if (!unitName || !assignedDriver) {
      return res.status(400).json({ 
        success: false, 
        message: 'Unit name and assigned driver are required' 
      });
    }

    // Verify driver exists
    const driver = await User.findOne({ 
      username: assignedDriver.toLowerCase(),
      role: 'Driver',
      isActive: true 
    });

    if (!driver) {
      return res.status(400).json({ 
        success: false, 
        message: `Driver '${assignedDriver}' not found` 
      });
    }

    const newAssignment = new DriverAllocation({
      unitName,
      unitId: unitId || `DISPATCH_${Date.now()}`,
      bodyColor: bodyColor || 'Not Specified',
      variation: variation || 'Standard',
      assignedDriver: driver.username,
      requestedProcesses: requestedProcesses || ['delivery_to_isuzu_pasig'],
      status: 'Pending',
      priority,
      notes,
      allocatedBy: 'Dispatch',
      date: new Date()
    });

    await newAssignment.save();
    
    console.log(`✅ Dispatch assignment created: ${unitName} -> ${driver.accountName}`);

    res.json({
      success: true,
      message: 'Assignment created successfully',
      data: newAssignment
    });
  } catch (error) {
    console.error('❌ Create dispatch assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create assignment',
      error: error.message 
    });
  }
};

// Update assignment process status
exports.updateAssignmentProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const { processName, status, notes } = req.body;

    if (!processName || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Process name and status are required' 
      });
    }

    const assignment = await DriverAllocation.findById(id);
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    // Update process status
    if (!assignment.processStatus) {
      assignment.processStatus = {};
    }
    
    assignment.processStatus[processName] = {
      status,
      notes,
      updatedAt: new Date()
    };

    // Calculate overall progress
    const totalProcesses = assignment.requestedProcesses.length;
    const completedProcesses = Object.values(assignment.processStatus).filter(
      p => p.status === 'Completed'
    ).length;
    
    assignment.overallProgress = Math.round((completedProcesses / totalProcesses) * 100);

    // Update overall status if all processes are complete
    if (assignment.overallProgress === 100) {
      assignment.status = 'Completed';
    } else if (assignment.overallProgress > 0) {
      assignment.status = 'In Progress';
    }

    await assignment.save();
    
    console.log(`✅ Process updated: ${processName} -> ${status} (${assignment.overallProgress}%)`);

    res.json({
      success: true,
      message: 'Process status updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('❌ Update assignment process error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update process',
      error: error.message 
    });
  }
};

// Update entire assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const assignment = await DriverAllocation.findByIdAndUpdate(
      id, 
      { ...updates, lastUpdated: new Date() }, 
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    console.log(`✅ Assignment updated: ${assignment.unitName}`);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('❌ Update assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update assignment',
      error: error.message 
    });
  }
};

// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await DriverAllocation.findByIdAndDelete(id);
    
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    console.log(`✅ Assignment deleted: ${assignment.unitName}`);

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete assignment',
      error: error.message 
    });
  }
};