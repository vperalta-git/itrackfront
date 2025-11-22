const User = require('../models/User');
const DriverAllocation = require('../models/DriverAllocation');
const Inventory = require('../models/Inventory');
const Servicerequest = require('../models/Servicerequest');

// Get all users - for admin history screen
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username accountName email role isActive lastLogin').lean();
    console.log(`📊 Admin users: Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create driver account specifically
exports.createDriver = async (req, res) => {
  try {
    const { username, password, accountName, email, phone } = req.body;
    
    console.log('👤 Admin creating driver account:', { username, accountName });
    
    if (!username || !password || !accountName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and account name are required for driver creation' 
      });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: `Username '${username}' already exists` 
      });
    }
    
    const newDriver = new User({
      username: username.toLowerCase().trim(),
      password: password,
      role: 'Driver',
      name: accountName,
      accountName: accountName,
      email: email || '',
      phone: phone || '',
      isActive: true,
      assignedTo: null,
      date: new Date()
    });
    
    await newDriver.save();
    
    // Return driver without password
    const driverResponse = { ...newDriver.toObject() };
    delete driverResponse.password;
    
    console.log('✅ Created driver account:', username, 'with name:', accountName);
    res.json({ 
      success: true, 
      message: `Driver account '${accountName}' created successfully`,
      data: driverResponse 
    });
  } catch (error) {
    console.error('❌ Create driver error:', error);
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Username already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// Assign vehicle to driver with enhanced validation
exports.assignVehicle = async (req, res) => {
  try {
    const { 
      unitName, 
      unitId, 
      driverUsername, 
      agentUsername,
      bodyColor,
      variation,
      processes 
    } = req.body;

    console.log('🚗 Admin assigning vehicle:', { unitName, unitId, driverUsername, agentUsername });

    // Basic validation
    if (!unitName || !driverUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle name and driver username are required' 
      });
    }
    
    // Verify driver exists and has correct role
    const driver = await User.findOne({ 
      username: driverUsername.toLowerCase(),
      role: 'Driver',
      isActive: true 
    });
    
    if (!driver) {
      return res.status(400).json({ 
        success: false, 
        message: `Driver '${driverUsername}' not found or not an active driver` 
      });
    }
    
    // Verify agent exists if provided
    let agent = null;
    if (agentUsername) {
      agent = await User.findOne({ 
        username: agentUsername.toLowerCase(),
        isActive: true 
      });
      
      if (!agent) {
        return res.status(400).json({ 
          success: false, 
          message: `Agent '${agentUsername}' not found or not active` 
        });
      }
    }
    
    // Check if vehicle is already assigned
    const existingAllocation = await DriverAllocation.findOne({ 
      unitId: unitId,
      status: { $in: ['In Progress', 'Assigned', 'Pending'] }
    });
    
    if (existingAllocation) {
      return res.status(400).json({ 
        success: false, 
        message: `Vehicle ${unitId} is already assigned to ${existingAllocation.assignedDriver}` 
      });
    }
    
    const allocation = new DriverAllocation({
      unitName,
      unitId: unitId || `VIN_${Date.now()}`,
      bodyColor: bodyColor || 'Not Specified',
      variation: variation || 'Standard',
      assignedDriver: driver.username,
      assignedAgent: agent ? agent.username : null,
      requestedProcesses: processes || ['delivery_to_isuzu_pasig'],
      status: 'Pending',
      allocatedBy: 'Admin',
      date: new Date()
    });
    
    await allocation.save();
    
    console.log('✅ Vehicle assigned successfully:', {
      vehicle: `${unitName} (${unitId})`,
      driver: driver.accountName,
      agent: agent ? agent.accountName : 'None',
      processes: allocation.requestedProcesses ? allocation.requestedProcesses.length : 0
    });
    
    res.json({ 
      success: true, 
      message: `Vehicle '${unitName}' assigned to driver '${driver.accountName}' successfully`,
      data: {
        allocation,
        driverInfo: {
          username: driver.username,
          accountName: driver.accountName,
          email: driver.email
        },
        agentInfo: agent ? {
          username: agent.username,
          accountName: agent.accountName,
          email: agent.email
        } : null,
        processCount: allocation.requestedProcesses ? allocation.requestedProcesses.length : 0
      }
    });
  } catch (error) {
    console.error('❌ Vehicle assignment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign vehicle',
      error: error.message 
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [users, allocations, inventory, requests] = await Promise.all([
      User.countDocuments(),
      DriverAllocation.countDocuments(),
      Inventory.countDocuments(),
      Servicerequest.countDocuments()
    ]);

    const stats = {
      totalUsers: users,
      totalAllocations: allocations,
      totalInventory: inventory,
      totalRequests: requests,
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
};