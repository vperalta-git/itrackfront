const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

console.log('🚀 Starting I-Track Mobile Backend Server...');

// Get local IP addresses for network flexibility
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push(interface.address);
      }
    }
  }
  
  return addresses.length > 0 ? addresses : ['localhost'];
}

// Get primary IP address (first non-internal IPv4)
function getPrimaryIPAddress() {
  const addresses = getLocalIPAddresses();
  return addresses[0] || 'localhost';
}

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 
  'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ================== ENHANCED USER ROUTES ==================
const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

// ================== SCHEMAS (Original Working Versions) ==================

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Driver Allocation Schema
const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  conductionNumber: String, 
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  status: String,
  date: { type: Date, default: Date.now },
  allocatedBy: String,
}, { timestamps: true });

// Inventory Schema  
const InventorySchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  quantity: { type: Number, default: 1 },
}, { timestamps: true });

// Vehicle Stock Schema
const VehicleStockSchema = new mongoose.Schema({
  unitName: String,
  bodyColor: String,
  variation: String,
  unitId: String,
}, { timestamps: true });

// Service Request Schema
const ServiceRequestSchema = new mongoose.Schema({
  dateCreated: Date,
  vehicleRegNo: String,
  service: Array,
  status: String,
  inProgressAt: Date,
  completedAt: Date,
  serviceDurationMinutes: Number,
  preparedBy: String,
}, { timestamps: true });

// Completed Request Schema
const CompletedRequestSchema = new mongoose.Schema({
  dateCreated: Date,
  vehicleRegNo: String,
  service: Array,
  status: String,
  inProgressAt: Date,
  completedAt: Date,
  serviceDurationMinutes: Number,
  preparedBy: String,
}, { timestamps: true });

// ================== MODELS ==================
const User = mongoose.model('User', UserSchema);
const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const VehicleStock = mongoose.model('VehicleStock', VehicleStockSchema);
const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);
const CompletedRequest = mongoose.model('CompletedRequest', CompletedRequestSchema);

// ================== MOBILE APP ROUTES (Original Working) ==================

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
    const { username, password, role, name, email, phone, assignedTo } = req.body;
    
    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and role are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    const newUser = new User({
      username: username.toLowerCase(),
      password: password, // In production, this should be hashed
      role: role,
      name: name || username,
      email: email || '',
      phone: phone || '',
      assignedTo: assignedTo || null,
      accountName: name || username,
      date: new Date()
    });
    
    await newUser.save();
    
    // Return user without password
    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;
    
    console.log('✅ Created user:', username, 'with role:', role);
    res.json({ success: true, message: 'User created successfully', data: userResponse });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update User
app.put('/updateUser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove password from update data if empty
    if (!updateData.password) {
      delete updateData.password;
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('✅ Updated user:', updatedUser.username);
    res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ success: false, error: error.message });
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
    res.json({ success: true, message: 'User deleted successfully', data: deletedUser });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ success: false, error: error.message });
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
app.get('/getStock', async (req, res) => {
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

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Mobile backend server is running!' });
});

// Root endpoint to identify the service
app.get('/', (req, res) => {
  res.json({ 
    service: 'I-Track Mobile Backend API',
    version: '2.0.0',
    status: 'active',
    deployment: 'render-nodejs',
    endpoints: {
      health: '/health',
      config: '/api/config',
      mobile_config: '/api/mobile-config',
      test: '/test'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check  
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'itrack-backend-nodejs',
    version: '2.0.0',
    deployment: 'render-fixed',
    timestamp: new Date().toISOString() 
  });
});

// API Configuration endpoint - provides dynamic server URLs for mobile app
app.get('/api/config', (req, res) => {
  const localIPs = getLocalIPAddresses();
  const primaryIP = getPrimaryIPAddress();
  const port = process.env.PORT || 5000;
  
  // Determine if we're in production (Render) or development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
  
  const config = {
    success: true,
    environment: isProduction ? 'production' : 'development',
    serverInfo: {
      primaryIP,
      allIPs: localIPs,
      port: port,
      hostname: os.hostname(),
      platform: os.platform()
    },
    apiUrls: {
      production: 'https://itrack-backend.onrender.com',
      development: localIPs.map(ip => `http://${ip}:${port}`).concat([
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`
      ]),
      // ALWAYS prioritize Render for mobile app universal access
      recommended: 'https://itrack-backend.onrender.com',
      // Priority order for mobile app discovery
      priority: [
        'https://itrack-backend.onrender.com',  // 🥇 Always try Render first
        `http://${primaryIP}:${port}`,          // 🥈 Local network fallback
        `http://localhost:${port}`,             // 🥉 Local development fallback
        ...localIPs.map(ip => `http://${ip}:${port}`)
      ]
    },
    mobileAppConfig: {
      alwaysUseRender: true,
      renderUrl: 'https://itrack-backend.onrender.com',
      fallbackUrls: localIPs.map(ip => `http://${ip}:${port}`).concat([
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
        'http://10.97.63.190:5000',    // User's phone network
        'http://192.168.254.147:5000', // User's computer network
      ]),
      connectionStrategy: 'render-first',
      maxRetries: 3,
      timeoutMs: 5000
    },
    networkRanges: [
      'http://192.168.254.{IP}:5000',  // Current network range
      'http://192.168.1.{IP}:5000',   // Common home network
      'http://192.168.0.{IP}:5000',   // Another common range
      'http://192.168.43.{IP}:5000',  // Mobile hotspot
      'http://192.168.100.{IP}:5000', // Corporate range
      'http://10.0.0.{IP}:5000',      // Another common range
      'http://172.16.0.{IP}:5000',    // Corporate network
    ],
    endpoints: {
      // Authentication & Users
      login: '/login',
      getUsers: '/getUsers',
      
      // Vehicle Management
      getAllocation: '/getAllocation',
      createAllocation: '/createAllocation',
      
      // Inventory & Stock
      getStock: '/getStock',
      createStock: '/createStock',
      
      // Service Requests
      getRequest: '/getRequest',
      getCompletedRequests: '/getCompletedRequests',
      
      // Dashboard
      dashboardStats: '/dashboard/stats',
      
      // Health & Config
      health: '/health',
      config: '/api/config',
      
      // Maps & Geocoding (NEW)
      geocode: '/api/maps/geocode',
      reverseGeocode: '/api/maps/reverse-geocode',
      directions: '/api/maps/directions',
      nearby: '/api/maps/nearby'
    },
    features: {
      mapsSupported: true,
      geocodingProvider: 'OpenStreetMap/Nominatim',
      directionsProvider: 'OSRM',
      nearbyPlacesProvider: 'Overpass API'
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(config);
});

// Simple mobile-friendly endpoint that always prioritizes Render
app.get('/api/mobile-config', (req, res) => {
  res.json({
    success: true,
    serverUrl: 'https://itrack-backend-1.onrender.com',
    environment: 'production',
    message: 'Always use Render for universal network access',
    fallbacks: [
      'https://itrack-backend-1.onrender.com',  // Primary - CORRECT URL
      'http://192.168.254.147:5000',            // Local fallback 1
      'http://10.97.63.190:5000',               // Local fallback 2
      'http://localhost:5000'                   // Local development
    ],
    timestamp: new Date().toISOString()
  });
});

// ================== DISPATCH ASSIGNMENT ENDPOINTS ==================

// Dispatch Assignment Schema
const dispatchAssignmentSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  unitName: { type: String, required: true },
  unitId: { type: String, required: true },
  bodyColor: { type: String, required: true },
  variation: { type: String, required: true },
  processes: [{ type: String, required: true }],
  status: { type: String, default: 'Assigned to Dispatch' },
  assignedBy: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now },
  completedProcesses: [{ type: String, default: [] }],
  completedAt: { type: Date },
  completedBy: { type: String }
}, { timestamps: true });

const DispatchAssignment = mongoose.model('DispatchAssignment', dispatchAssignmentSchema);

// GET /api/dispatch/assignments - Fetch all dispatch assignments
app.get('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Fetching dispatch assignments...');
    
    const assignments = await DispatchAssignment.find().sort({ createdAt: -1 });
    
    console.log(`✅ Found ${assignments.length} dispatch assignments`);
    
    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('❌ Error fetching dispatch assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispatch assignments',
      details: error.message
    });
  }
});

// POST /api/dispatch/assignments - Create new dispatch assignment
app.post('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Creating dispatch assignment:', req.body);
    
    const { vehicleId, unitName, unitId, bodyColor, variation, processes, assignedBy } = req.body;
    
    // Validate required fields
    if (!vehicleId || !unitName || !unitId || !processes || !assignedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, unitName, unitId, processes, assignedBy'
      });
    }

    // Check if assignment already exists for this vehicle
    const existingAssignment = await DispatchAssignment.findOne({ vehicleId });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle already assigned to dispatch'
      });
    }

    // Create new dispatch assignment
    const newAssignment = new DispatchAssignment({
      vehicleId,
      unitName,
      unitId,
      bodyColor,
      variation,
      processes: Array.isArray(processes) ? processes : [processes],
      assignedBy,
      status: 'Assigned to Dispatch'
    });

    const savedAssignment = await newAssignment.save();
    
    console.log('✅ Dispatch assignment created:', savedAssignment);
    
    res.status(201).json({
      success: true,
      data: savedAssignment,
      message: 'Vehicle successfully assigned to dispatch'
    });
    
  } catch (error) {
    console.error('❌ Error creating dispatch assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dispatch assignment',
      details: error.message
    });
  }
});

// PUT /api/dispatch/assignments/:id/process - Update process completion
app.put('/api/dispatch/assignments/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processName, completedBy } = req.body;
    
    console.log(`📋 Updating process ${processName} for assignment ${id}`);
    
    const assignment = await DispatchAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Dispatch assignment not found'
      });
    }

    // Add process to completed list if not already there
    if (!assignment.completedProcesses.includes(processName)) {
      assignment.completedProcesses.push(processName);
    }

    // Check if all processes are completed
    const allProcessesCompleted = assignment.processes.every(process => 
      assignment.completedProcesses.includes(process)
    );

    if (allProcessesCompleted) {
      assignment.status = 'Ready for Release';
      assignment.completedAt = new Date();
      assignment.completedBy = completedBy;
    } else {
      assignment.status = 'In Progress';
    }

    const updatedAssignment = await assignment.save();
    
    console.log('✅ Process updated:', updatedAssignment);
    
    res.json({
      success: true,
      data: updatedAssignment,
      message: `Process ${processName} completed successfully`
    });
    
  } catch (error) {
    console.error('❌ Error updating process:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update process',
      details: error.message
    });
  }
});

// PUT /api/dispatch/assignments/:id - Update dispatch assignment status
app.put('/api/dispatch/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completedBy } = req.body;
    
    console.log(`📋 Updating assignment ${id} status to ${status}`);
    
    const assignment = await DispatchAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Dispatch assignment not found'
      });
    }

    assignment.status = status;
    if (status === 'Released' || status === 'Completed') {
      assignment.completedAt = new Date();
      assignment.completedBy = completedBy;
    }

    const updatedAssignment = await assignment.save();
    
    console.log('✅ Assignment status updated:', updatedAssignment);
    
    res.json({
      success: true,
      data: updatedAssignment,
      message: `Assignment status updated to ${status}`
    });
    
  } catch (error) {
    console.error('❌ Error updating assignment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assignment status',
      details: error.message
    });
  }
});

// DELETE /api/dispatch/assignments/:id - Delete dispatch assignment
app.delete('/api/dispatch/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Deleting dispatch assignment ${id}`);
    
    const deletedAssignment = await DispatchAssignment.findByIdAndDelete(id);
    if (!deletedAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Dispatch assignment not found'
      });
    }
    
    console.log('✅ Dispatch assignment deleted:', deletedAssignment);
    
    res.json({
      success: true,
      data: deletedAssignment,
      message: 'Dispatch assignment deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting dispatch assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete dispatch assignment',
      details: error.message
    });
  }
});

// ================== MAPS & GEOCODING ENDPOINTS (OpenStreetMap) ==================

// Geocoding: Convert address to coordinates
app.get('/api/maps/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ 
        success: false, 
        error: 'Address parameter is required' 
      });
    }
    
    // Using Nominatim (OpenStreetMap) for geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'I-Track Mobile App v1.0'
      }
    });
    
    const data = await response.json();
    
    const results = data.map(item => ({
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      importance: item.importance,
      type: item.type,
      class: item.class
    }));
    
    res.json({
      success: true,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Geocoding service temporarily unavailable'
    });
  }
});

// Reverse Geocoding: Convert coordinates to address
app.get('/api/maps/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        error: 'Latitude and longitude parameters are required' 
      });
    }
    
    // Using Nominatim for reverse geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'I-Track Mobile App v1.0'
      }
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(404).json({
        success: false,
        error: 'No address found for these coordinates'
      });
    }
    
    res.json({
      success: true,
      address: data.display_name,
      details: {
        house_number: data.address?.house_number,
        road: data.address?.road,
        suburb: data.address?.suburb,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        postcode: data.address?.postcode,
        country: data.address?.country
      },
      coordinates: {
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon)
      }
    });
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: 'Reverse geocoding service temporarily unavailable'
    });
  }
});

// Get route directions between two points
app.get('/api/maps/directions', async (req, res) => {
  try {
    const { start_lat, start_lon, end_lat, end_lon } = req.query;
    
    if (!start_lat || !start_lon || !end_lat || !end_lon) {
      return res.status(400).json({ 
        success: false, 
        error: 'Start and end coordinates are required (start_lat, start_lon, end_lat, end_lon)' 
      });
    }
    
    // Using OpenRouteService (free alternative to Google Directions)
    // Note: For production, you might want to get an API key from openrouteservice.org
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${start_lon},${start_lat};${end_lon},${end_lat}?overview=full&geometries=geojson`;
    
    const response = await fetch(routeUrl);
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      return res.status(404).json({
        success: false,
        error: 'No route found between these points'
      });
    }
    
    const route = data.routes[0];
    
    res.json({
      success: true,
      route: {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        geometry: route.geometry, // GeoJSON LineString
        steps: route.legs[0]?.steps || []
      },
      summary: {
        distance_km: (route.distance / 1000).toFixed(2),
        duration_minutes: Math.round(route.duration / 60),
        start_coordinates: [parseFloat(start_lat), parseFloat(start_lon)],
        end_coordinates: [parseFloat(end_lat), parseFloat(end_lon)]
      }
    });
    
  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({
      success: false,
      error: 'Directions service temporarily unavailable'
    });
  }
});

// Get nearby places (Points of Interest)
app.get('/api/maps/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 1000, type = 'amenity' } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        error: 'Latitude and longitude parameters are required' 
      });
    }
    
    // Using Overpass API for nearby places
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
      [out:json][timeout:25];
      (
        node["${type}"]["name"](around:${radius},${lat},${lon});
      );
      out geom;
    `;
    
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });
    
    const data = await response.json();
    
    const places = data.elements.map(element => ({
      id: element.id,
      name: element.tags.name,
      type: element.tags[type],
      coordinates: {
        latitude: element.lat,
        longitude: element.lon
      },
      tags: element.tags
    })).filter(place => place.name); // Only include places with names
    
    res.json({
      success: true,
      places,
      count: places.length,
      search_area: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
        radius_meters: parseInt(radius)
      }
    });
    
  } catch (error) {
    console.error('Nearby places error:', error);
    res.status(500).json({
      success: false,
      error: 'Nearby places service temporarily unavailable'
    });
  }
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
const localIPs = getLocalIPAddresses();
const primaryIP = getPrimaryIPAddress();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Mobile Backend Server running on port ${PORT}`);
  console.log(`🌐 Network Information:`);
  console.log(`   - Primary IP: ${primaryIP}`);
  console.log(`   - All Network IPs: ${localIPs.join(', ')}`);
  console.log(`   - Hostname: ${os.hostname()}`);
  console.log(`   - Platform: ${os.platform()}`);
  console.log('');
  console.log('📱 Mobile App Connection URLs:');
  localIPs.forEach((ip, index) => {
    const label = index === 0 ? 'Primary' : `Alternative ${index}`;
    console.log(`   - ${label}: http://${ip}:${PORT}`);
  });
  console.log(`   - Localhost: http://localhost:${PORT}`);
  console.log(`   - Loopback: http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  - POST /login');
  console.log('  - GET  /getUsers');
  console.log('  - GET  /getAllocation');
  console.log('  - POST /createAllocation');
  console.log('  - GET  /getStock');
  console.log('  - POST /createStock');
  console.log('  - GET  /getRequest');
  console.log('  - GET  /getCompletedRequests');
  console.log('  - GET  /dashboard/stats');
  console.log('  - GET  /api/dispatch/assignments');
  console.log('  - POST /api/dispatch/assignments');
  console.log('  - PUT  /api/dispatch/assignments/:id/process');
  console.log('  - PUT  /api/dispatch/assignments/:id');
  console.log('  - DELETE /api/dispatch/assignments/:id');
  console.log('  - GET  /test');
  console.log('  - GET  /health');
  console.log('');
  console.log('✅ Ready for mobile app connections!');
  console.log('💡 Use the Primary IP for connecting from other devices on the same network');
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
