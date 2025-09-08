const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

console.log('🚀 Starting I-Track Mobile Backend Server...');

// Get local IP address for network flexibility
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost'; // fallback
}

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 
  'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

// User Schema with Role Validation
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'manager', 'salesAgent', 'Admin', 'Manager', 'Sales Agent', 'Driver', 'Supervisor'], default: 'salesAgent' },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const User = mongoose.model('User', UserSchema);

// Driver Allocation Schema with Process Tracking
const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  assignedAgent: String,
  status: String,
  allocatedBy: String,
  requestedProcesses: [String], // Array of process IDs
  processStatus: {
    type: Map,
    of: Boolean,
    default: {}
  }, // Map of process_id -> completion status
  processCompletedBy: {
    type: Map,
    of: String,
    default: {}
  }, // Map of process_id -> completed_by_user
  processCompletedAt: {
    type: Map,
    of: Date,
    default: {}
  }, // Map of process_id -> completion_date
  overallProgress: { 
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: false }
  }, // Progress tracking object
  isReady: { type: Boolean, default: false }, // Ready for release
  readyBy: String,
  readyAt: Date,
  date: { type: Date, default: Date.now }
}, { timestamps: true });
const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema);

// Inventory Schema (updated to match actual usage)
const InventorySchema = new mongoose.Schema({
  unitName: { type: String, required: true },
  unitId: { type: String, required: true },
  bodyColor: { type: String, required: true },
  variation: String,
  quantity: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['Available', 'Reserved', 'Sold', 'Assigned to Dispatch', 'In Process', 'In Dispatch', 'Allocated', 'Assigned to Driver'], 
    default: 'Available' 
  },
  location: String,
  description: String,
  features: [String],
  images: [String],
  dateAdded: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

const Inventory = mongoose.model('Inventory', InventorySchema);

// Service Request Schema
const ServiceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  serviceType: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'], 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  assignedTo: String,
  description: String,
  estimatedCost: Number,
  actualCost: Number,
  dateRequested: { type: Date, default: Date.now },
  dateCompleted: Date,
  notes: String
});
const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);

// Completed Request Schema
const CompletedRequestSchema = new mongoose.Schema({
  originalRequestId: { type: String, required: true },
  customerName: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  serviceType: { type: String, required: true },
  completedBy: String,
  completionDate: { type: Date, default: Date.now },
  finalCost: Number,
  customerSatisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: String
});
const CompletedRequest = mongoose.model('CompletedRequest', CompletedRequestSchema);

// In Progress Request Schema
const InProgressRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  customerName: { type: String, required: true },
  vehicleModel: { type: String, required: true },
  serviceType: { type: String, required: true },
  assignedTo: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  estimatedCompletion: Date,
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  currentStage: String,
  notes: String
});
const InProgressRequest = mongoose.model('InProgressRequest', InProgressRequestSchema);

mongoose.connect(mongoURI)
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  
  // Create sample data if database is empty
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('📝 Creating sample users...');
      
      const sampleUsers = [
        { username: 'admin', password: 'admin123', role: 'Admin', accountName: 'Administrator' },
        { username: 'manager1', password: 'manager123', role: 'Manager', accountName: 'John Manager' },
        { username: 'agent1', password: 'agent123', role: 'Sales Agent', accountName: 'Alice Agent' },
        { username: 'agent2', password: 'agent123', role: 'Sales Agent', accountName: 'Bob Agent' },
        { username: 'driver1', password: 'driver123', role: 'Driver', accountName: 'Charlie Driver' },
        { username: 'supervisor1', password: 'supervisor123', role: 'Supervisor', accountName: 'David Supervisor' }
      ];

      for (const userData of sampleUsers) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created sample user: ${user.username} (${user.role})`);
      }
    }
  } catch (err) {
    console.log('⚠️ Sample data creation will run after models are defined');
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// ================== API CONFIGURATION ==================

// ================== API ROUTES ==================

// API Configuration endpoint
app.get('/api/config', (req, res) => {
  const PORT = process.env.PORT || 5000;
  const localIP = getLocalIPAddress();
  
  // Determine base URL based on environment
  let baseUrl;
  if (process.env.NODE_ENV === 'production') {
    baseUrl = 'https://itrack-backend.onrender.com';
  } else {
    // Use the actual local IP address for better network flexibility
    baseUrl = `http://${localIP}:${PORT}`;
  }
  
  // Also provide alternative URLs for different network scenarios
  const alternativeUrls = [
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    `http://${localIP}:${PORT}`,
    `http://192.168.1.${localIP.split('.')[3]}:${PORT}`, // Common home network range
    `http://192.168.0.${localIP.split('.')[3]}:${PORT}`, // Another common range
  ];
    
  res.json({
    success: true,
    config: {
      backend: {
        BASE_URL: baseUrl,
        LOCAL_IP: localIP,
        PORT: PORT,
        ALTERNATIVE_URLS: alternativeUrls,
        NAME: process.env.NODE_ENV === 'production' ? 'Production Backend' : 'Local Development Backend',
        ENVIRONMENT: process.env.NODE_ENV || 'development',
        NETWORK_INFO: {
          hostname: os.hostname(),
          platform: os.platform(),
          localIP: localIP
        }
      },
      endpoints: {
        // Authentication
        LOGIN: '/login',
        
        // User Management
        GET_USERS: '/getUsers',
        CREATE_USER: '/createUser',
        DELETE_USER: '/deleteUser',
        
        // Allocation Management
        GET_ALLOCATION: '/getAllocation',
        CREATE_ALLOCATION: '/createAllocation',
        UPDATE_PROCESS: '/updateProcess',
        ADD_PROCESSES: '/addProcesses',
        MARK_READY: '/markReady',
        
        // Inventory/Stock Management
        GET_STOCK: '/getStock',
        CREATE_STOCK: '/createStock',
        UPDATE_STOCK: '/updateStock',
        DELETE_STOCK: '/deleteStock',
        UPDATE_INVENTORY: '/api/inventory',
        
        // Request Management
        GET_REQUEST: '/getRequest',
        GET_COMPLETED_REQUESTS: '/getCompletedRequests',
        
        // Dispatch Assignment (New)
        CREATE_DISPATCH_ASSIGNMENT: '/api/dispatch/assignments',
        GET_DISPATCH_ASSIGNMENTS: '/api/dispatch/assignments',
        UPDATE_DISPATCH_PROCESS: '/api/dispatch/assignments/:id/process',
        
        // System
        DASHBOARD_STATS: '/dashboard/stats',
        CONFIG: '/api/config',
        TEST: '/test',
        HEALTH: '/health'
      },
      helper: {
        buildApiUrl: (endpoint) => `${baseUrl}${endpoint}`
      },
      serverInfo: {
        name: 'I-Track Mobile Backend',
        version: '2.0.0',
        features: ['Dispatch Assignment', 'Process Management', 'Real-time Updates'],
        timestamp: new Date().toISOString()
      }
    }
  });
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📥 Login attempt:', username);
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: user.username,
        role: user.role,
        accountName: user.accountName,
        assignedTo: user.assignedTo
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Users
app.get('/getUsers', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    console.log(`📊 Found ${users.length} users`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create User
app.post('/createUser', async (req, res) => {
  try {
    const { username, password, role, accountName, assignedTo } = req.body;
    
    if (!username || !password || !role || !accountName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password,
      role,
      accountName,
      assignedTo: assignedTo || null
    });

    await newUser.save();
    console.log('✅ Created user:', newUser.username);
    
    res.json({ 
      success: true, 
      message: 'User created successfully', 
      user: { 
        username: newUser.username, 
        role: newUser.role, 
        accountName: newUser.accountName 
      } 
    });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete User
app.delete('/deleteUser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('✅ Deleted user:', deletedUser.username);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Driver Allocations
app.get('/getAllocation', async (req, res) => {
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
app.post('/createAllocation', async (req, res) => {
  try {
    const { unitName, unitId, bodyColor, variation, assignedDriver, assignedAgent, status, allocatedBy, requestedProcesses } = req.body;
    
    const newAllocation = new DriverAllocation({
      unitName,
      unitId,
      bodyColor,
      variation,
      assignedDriver,
      assignedAgent,
      status: status || 'Assigned',
      allocatedBy: allocatedBy || 'Admin',
      requestedProcesses: requestedProcesses || [],
      overallProgress: {
        completed: 0,
        total: requestedProcesses ? requestedProcesses.length : 0,
        isComplete: false
      },
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

// Update Process Status (for Dispatch)
app.put('/updateProcess/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { processName, isCompleted, completedBy } = req.body;
    
    const allocation = await DriverAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ success: false, error: 'Allocation not found' });
    }

    // Update process status
    allocation.processStatus[processName] = isCompleted;
    
    if (isCompleted) {
      allocation.processCompletedBy[processName] = completedBy;
      allocation.processCompletedAt[processName] = new Date();
    } else {
      allocation.processCompletedBy[processName] = undefined;
      allocation.processCompletedAt[processName] = undefined;
    }

    // Calculate overall progress
    const completedProcesses = Object.values(allocation.processStatus).filter(status => status === true).length;
    allocation.overallProgress.completed = completedProcesses;
    allocation.overallProgress.total = allocation.requestedProcesses.length;
    allocation.overallProgress.isComplete = completedProcesses === allocation.requestedProcesses.length;

    // Auto-update status based on progress
    if (allocation.overallProgress.isComplete && allocation.requestedProcesses.length > 0) {
      allocation.status = 'Ready for Release';
      allocation.readyForRelease = true;
    }

    await allocation.save();
    
    console.log(`✅ Updated process ${processName} for allocation:`, allocation.unitName);
    res.json({ success: true, message: 'Process updated successfully', data: allocation });
  } catch (error) {
    console.error('❌ Update process error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Processes to Allocation (for Admin)
app.put('/addProcesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedProcesses } = req.body;
    
    const allocation = await DriverAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ success: false, error: 'Allocation not found' });
    }

    allocation.requestedProcesses = requestedProcesses;
    allocation.overallProgress.total = requestedProcesses.length;
    allocation.overallProgress.completed = Object.values(allocation.processStatus).filter(status => status === true).length;
    allocation.overallProgress.isComplete = allocation.overallProgress.completed === allocation.overallProgress.total;

    await allocation.save();
    
    console.log('✅ Added processes to allocation:', allocation.unitName);
    res.json({ success: true, message: 'Processes added successfully', data: allocation });
  } catch (error) {
    console.error('❌ Add processes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark as Ready for Release
app.put('/markReady/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { releasedBy } = req.body;
    
    const allocation = await DriverAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ success: false, error: 'Allocation not found' });
    }

    allocation.readyForRelease = true;
    allocation.releasedAt = new Date();
    allocation.releasedBy = releasedBy;
    allocation.status = 'Ready for Release';

    await allocation.save();
    
    console.log('✅ Marked as ready for release:', allocation.unitName);
    res.json({ success: true, message: 'Vehicle marked as ready for release', data: allocation });
  } catch (error) {
    console.error('❌ Mark ready error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Stock/Inventory
app.get('/getStock', async (req, res) => {
  try {
    const inventory = await Inventory.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${inventory.length} stock items`);
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('❌ Get stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create Stock
app.post('/createStock', async (req, res) => {
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
    console.log('✅ Created stock:', newStock.unitName);
    res.json({ success: true, message: 'Stock created successfully', data: newStock });
  } catch (error) {
    console.error('❌ Create stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Stock
app.put('/updateStock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { unitName, unitId, bodyColor, variation, quantity, status } = req.body;
    
    const updatedStock = await Inventory.findByIdAndUpdate(
      id,
      {
        unitName,
        unitId,
        bodyColor,
        variation,
        quantity: quantity || 1,
        status: status || 'Available'
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedStock) {
      return res.status(404).json({ success: false, error: 'Stock item not found' });
    }

    console.log('✅ Updated stock:', updatedStock.unitName);
    res.json({ success: true, message: 'Stock updated successfully', data: updatedStock });
  } catch (error) {
    console.error('❌ Update stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Stock
app.delete('/deleteStock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedStock = await Stock.findByIdAndDelete(id);
    
    if (!deletedStock) {
      return res.status(404).json({ success: false, error: 'Stock item not found' });
    }

    console.log('✅ Deleted stock:', deletedStock.unitName);
    res.json({ success: true, message: 'Stock deleted successfully', data: deletedStock });
  } catch (error) {
    console.error('❌ Delete stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Inventory (API endpoint for frontend)
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`📋 Updating stock item ${id}:`, updateData);
    
    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedItem) {
      return res.status(404).json({ success: false, error: 'Stock item not found' });
    }

    console.log('✅ Updated stock item:', updatedItem.unitName);
    res.json({ success: true, message: 'Stock updated successfully', data: updatedItem });
  } catch (error) {
    console.error('❌ Update inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Service Requests
app.get('/getRequest', async (req, res) => {
  try {
    const requests = await ServiceRequest.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${requests.length} service requests`);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ Get requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Completed Requests
app.get('/getCompletedRequests', async (req, res) => {
  try {
    const completed = await CompletedRequest.find({}).sort({ completedAt: -1 });
    console.log(`📊 Found ${completed.length} completed requests`);
    res.json({ success: true, data: completed });
  } catch (error) {
    console.error('❌ Get completed requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard Stats (for reports)
app.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAllocations = await DriverAllocation.countDocuments();
    const activeAllocations = await DriverAllocation.countDocuments({ status: 'In Transit' });
    const totalStock = await Inventory.countDocuments();
    
    console.log(`📊 Dashboard stats - Users: ${totalUsers}, Allocations: ${totalAllocations}, Stock: ${totalStock}`);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalAllocations,
        activeAllocations,
        totalStock,
        totalVehicles: totalStock,
        totalDrivers: await User.countDocuments({ role: 'Driver' }),
        totalAgents: await User.countDocuments({ role: 'Sales Agent' })
      }
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dispatch Assignment Schema
const DispatchAssignmentSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true }, // Changed from ObjectId to String
  unitName: { type: String, required: true },
  unitId: String,
  bodyColor: String,
  variation: String,
  processes: [String], // Array of process IDs
  status: { type: String, default: 'Assigned to Dispatch' },
  assignedAt: { type: Date, default: Date.now },
  assignedBy: String,
  processStatus: {
    type: Map,
    of: Boolean,
    default: {}
  },
  processCompletedBy: {
    type: Map,
    of: String,
    default: {}
  },
  processCompletedAt: {
    type: Map,
    of: Date,
    default: {}
  }
});
const DispatchAssignment = mongoose.model('DispatchAssignment', DispatchAssignmentSchema);

// ================== DISPATCH ASSIGNMENT ENDPOINTS ==================

// Create Dispatch Assignment
app.post('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Creating dispatch assignment:', req.body);
    
    const assignmentData = req.body;
    
    // Create new dispatch assignment
    const newAssignment = new DispatchAssignment(assignmentData);
    
    // Initialize process status map
    if (assignmentData.processes && Array.isArray(assignmentData.processes)) {
      const processStatusMap = {};
      assignmentData.processes.forEach(processId => {
        processStatusMap[processId] = false;
      });
      newAssignment.processStatus = processStatusMap;
    }
    
    const savedAssignment = await newAssignment.save();
    
    console.log('✅ Dispatch assignment created:', savedAssignment._id);
    res.json({ 
      success: true, 
      message: 'Dispatch assignment created successfully',
      assignment: savedAssignment 
    });
    
  } catch (error) {
    console.error('❌ Create dispatch assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Dispatch Assignments
app.get('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Fetching dispatch assignments...');
    
    const assignments = await DispatchAssignment.find().sort({ assignedAt: -1 });
    
    console.log(`✅ Found ${assignments.length} dispatch assignments`);
    res.json({ success: true, data: assignments });
    
  } catch (error) {
    console.error('❌ Get dispatch assignments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Dispatch Assignment Process
app.put('/api/dispatch/assignments/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processId, completed, completedBy } = req.body;
    
    console.log(`📋 Updating process ${processId} for assignment ${id}`);
    
    const assignment = await DispatchAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    // Update process status
    assignment.processStatus.set(processId, completed);
    
    if (completed) {
      assignment.processCompletedBy.set(processId, completedBy);
      assignment.processCompletedAt.set(processId, new Date());
    } else {
      assignment.processCompletedBy.delete(processId);
      assignment.processCompletedAt.delete(processId);
    }
    
    await assignment.save();
    
    console.log('✅ Process status updated');
    res.json({ success: true, assignment });
    
  } catch (error) {
    console.error('❌ Update process error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Mobile backend server is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ================== RELEASE MANAGEMENT ENDPOINTS ==================

// Release History Schema
const ReleaseHistorySchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  unitName: { type: String, required: true },
  unitId: String,
  bodyColor: String,
  variation: String,
  completedProcesses: [String],
  releasedBy: String,
  releasedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Released to Customer' }
});

const ReleaseHistory = mongoose.model('ReleaseHistory', ReleaseHistorySchema);

// Create Release Record
app.post('/api/releases', async (req, res) => {
  try {
    console.log('📋 Creating release record:', req.body);
    
    const releaseData = req.body;
    const newRelease = new ReleaseHistory(releaseData);
    const savedRelease = await newRelease.save();
    
    console.log('✅ Release record created:', savedRelease._id);
    res.json({ 
      success: true, 
      message: 'Release record created successfully',
      release: savedRelease 
    });
    
  } catch (error) {
    console.error('❌ Create release record error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Release History
app.get('/api/releases', async (req, res) => {
  try {
    console.log('📋 Fetching release history...');
    
    const releases = await ReleaseHistory.find().sort({ releasedAt: -1 });
    
    console.log(`✅ Found ${releases.length} release records`);
    res.json({ success: true, data: releases });
    
  } catch (error) {
    console.error('❌ Get release history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
const localIP = getLocalIPAddress();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mobile Backend Server running on port ${PORT}`);
  console.log(`🌐 Network Information:`);
  console.log(`   - Local IP: ${localIP}`);
  console.log(`   - Local URL: http://${localIP}:${PORT}`);
  console.log(`   - Localhost: http://localhost:${PORT}`);
  console.log(`   - Hostname: ${os.hostname()}`);
  console.log(`   - Platform: ${os.platform()}`);
  console.log('');
  console.log('� Mobile App Connection URLs:');
  console.log(`   - Primary: http://${localIP}:${PORT}`);
  console.log(`   - Fallback: http://localhost:${PORT}`);
  console.log(`   - Alternative: http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('�📋 Available endpoints:');
  console.log('  - POST /login');
  console.log('  - GET  /getUsers');
  console.log('  - POST /createUser');
  console.log('  - DELETE /deleteUser/:id');
  console.log('  - GET  /getAllocation');
  console.log('  - POST /createAllocation');
  console.log('  - PUT  /updateProcess/:id');
  console.log('  - PUT  /addProcesses/:id');
  console.log('  - PUT  /markReady/:id');
  console.log('  - GET  /getStock');
  console.log('  - POST /createStock');
  console.log('  - PUT  /updateStock/:id');
  console.log('  - DELETE /deleteStock/:id');
  console.log('  - PUT  /api/inventory/:id');
  console.log('  - GET  /getRequest');
  console.log('  - GET  /getCompletedRequests');
  console.log('  - GET  /dashboard/stats');
  console.log('  - POST /api/dispatch/assignments');
  console.log('  - GET  /api/dispatch/assignments');
  console.log('  - PUT  /api/dispatch/assignments/:id/process');
  console.log('  - POST /api/release/confirm');
  console.log('  - GET  /api/release/history');
  console.log('  - GET  /api/config');
  console.log('  - GET  /test');
  console.log('  - GET  /health');
  console.log('✅ Ready for mobile app connections!');
  console.log('💡 Tip: Use the Local IP for connecting from other devices on the same network');
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
})