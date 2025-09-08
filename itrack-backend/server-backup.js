console.log('📂 Loading FIXED server.js file...');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting I-Track Backend Server (FIXED VERSION)...');

const app = express();

// Enable CORS for all origins - Mobile app compatibility
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection string
const mongoURI = process.env.MONGODB_URI || 
  'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔌 Connecting to MongoDB...');

// Connect to MongoDB Atlas
mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Starting server without MongoDB connection...');
  });

// ================== CONSOLIDATED SCHEMAS ==================
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String }, // For web app compatibility
  name: { type: String }, // For web app compatibility
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Supervisor', 'Manager', 'Sales Agent', 'Driver', 'Dispatch'],
    default: 'Sales Agent',
  },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const VehicleSchema = new mongoose.Schema({
  vin: String,
  unitId: String,
  model: String,
  driver: String,
  current_status: String,
  requested_processes: [String],
  preparation_status: {
    tinting: { type: Boolean, default: false },
    carwash: { type: Boolean, default: false },
    ceramic_coating: { type: Boolean, default: false },
    accessories: { type: Boolean, default: false },
    rust_proof: { type: Boolean, default: false },
    ready_for_release: { type: Boolean, default: false },
  },
  location: { lat: Number, lng: Number },
  customer_name: String,
  customer_number: String,
}, { timestamps: true });

// Use consistent naming with web app (Inventory = VehicleStock)
const InventorySchema = new mongoose.Schema({
  unitName: { type: String },
  unitId: { type: String },
  bodyColor: { type: String },
  variation: { type: String },
  conductionNumber: { type: String }, // For mobile app compatibility
  quantity: { type: Number, default: 1 }, // For web app compatibility
}, { timestamps: true });

const ServiceRequestSchema = new mongoose.Schema({
  dateCreated: { type: Date, default: Date.now },
  vehicleRegNo: String,
  service: [{ serviceTime: String, status: String }],
  status: String,
}, { timestamps: true });

const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  status: String,
  date: Date,
}, { timestamps: true });

// ================== MODELS ==================
const User = mongoose.model('User', UserSchema);
const Vehicle = mongoose.model('Vehicle', VehicleSchema);
const Inventory = mongoose.model('Inventory', InventorySchema);
const ServiceRequest = mongoose.model('ServiceRequest', ServiceRequestSchema);
const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema);

// ================== UNIFIED ROUTES (Support both /api and direct paths) ==================

// === AUTHENTICATION ===
const handleLogin = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    const loginField = email || username;
    
    console.log('📥 Login Attempt:', { field: loginField, password: '***', role });

    if (!loginField || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username/Email and password are required' 
      });
    }

    // Find user by email or username
    let user = await User.findOne({ 
      $or: [
        { email: loginField },
        { username: loginField.toLowerCase() }
      ]
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Role validation for mobile app
    if (role && user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied for role: ${role}` 
      });
    }

    console.log('✅ Login successful for:', user.accountName || user.username);
    
    // Return format compatible with both web and mobile
    res.json({ 
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email || user.username,
        name: user.accountName,
        accountName: user.accountName,
        role: user.role,
        assignedTo: user.assignedTo,
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Both web app and mobile app login routes
app.post('/api/login', handleLogin);
app.post('/login', handleLogin);

app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/checkAuth', (req, res) => {
  res.json({ authenticated: false });
});

// === USER MANAGEMENT ===
const handleGetUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    
    // Web app expects direct array, mobile expects { success: true, users: [] }
    if (req.path.startsWith('/api')) {
      res.json(users); // Web app format
    } else {
      res.json({ success: true, users }); // Mobile app format
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
  }
};

app.get('/api/getUsers', handleGetUsers);
app.get('/admin/users', handleGetUsers);

const handleCreateUser = async (req, res) => {
  try {
    const { name, email, role, username, password, accountName, assignedTo } = req.body;
    
    if (!password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newUser = new User({
      username: (username || email || name).toLowerCase().trim(),
      email: email || username,
      name: name || accountName,
      accountName: accountName || name,
      password,
      role,
      assignedTo
    });

    await newUser.save();
    res.json({ success: true, message: 'User created successfully', user: newUser });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating user', error: err.message });
  }
};

app.post('/api/createUser', handleCreateUser);
app.post('/admin/create-user', handleCreateUser);

app.delete('/api/deleteUser/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting user', error: err.message });
  }
});

app.get('/admin/managers', async (req, res) => {
  try {
    const managers = await User.find({ role: 'Manager' }, '-password');
    res.json({ success: true, managers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching managers', error: err.message });
  }
});

// === INVENTORY/VEHICLE STOCKS ===
const handleGetStock = async (req, res) => {
  try {
    console.log('[INVENTORY] Fetching vehicle stocks...');
    const stocks = await Inventory.find({}).sort({ createdAt: -1 });
    
    console.log(`[INVENTORY] Found ${stocks.length} stocks`);
    
    // Transform for mobile app compatibility
    const transformedStocks = stocks.map(stock => ({
      _id: stock._id,
      unitName: stock.unitName,
      unitId: stock.unitId,
      bodyColor: stock.bodyColor,
      variation: stock.variation,
      conductionNumber: stock.conductionNumber || stock.unitId,
      quantity: stock.quantity || 1,
      status: stock.status || 'Available',
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt
    }));

    // Return appropriate format based on route
    if (req.path.startsWith('/api')) {
      res.json(transformedStocks); // Web app format (direct array)
    } else {
      res.json({ success: true, data: transformedStocks, count: transformedStocks.length }); // Mobile format
    }
  } catch (err) {
    console.error('[INVENTORY] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/getStock', handleGetStock);
app.get('/vehicle-stocks', handleGetStock);

const handleCreateStock = async (req, res) => {
  try {
    const stockData = req.body;
    console.log('[INVENTORY] Creating stock:', stockData);
    
    // Validate required fields
    if (!stockData.unitName || !stockData.bodyColor || !stockData.variation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: unitName, bodyColor, and variation'
      });
    }
    
    const newStock = new Inventory({
      unitName: stockData.unitName,
      unitId: stockData.unitId || stockData.unitName,
      bodyColor: stockData.bodyColor,
      variation: stockData.variation,
      conductionNumber: stockData.conductionNumber,
      quantity: stockData.quantity || 1
    });
    
    const savedStock = await newStock.save();
    console.log('[INVENTORY] Stock saved:', savedStock._id);
    
    res.json({ success: true, data: savedStock });
  } catch (err) {
    console.error('[INVENTORY] Create error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/createStock', handleCreateStock);
app.post('/vehicle-stocks', handleCreateStock);

// === DRIVER ALLOCATIONS ===
const handleGetAllocations = async (req, res) => {
  try {
    const allocations = await DriverAllocation.find({}).sort({ createdAt: -1 });
    
    if (req.path.startsWith('/api')) {
      res.json(allocations); // Web app format
    } else {
      res.json({ success: true, data: allocations }); // Mobile format
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/getAllocation', handleGetAllocations);
app.get('/driver-allocations', handleGetAllocations);

const handleCreateAllocation = async (req, res) => {
  try {
    const allocationData = req.body;
    const newAllocation = new DriverAllocation(allocationData);
    await newAllocation.save();
    res.json({ success: true, data: newAllocation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/createAllocation', handleCreateAllocation);
app.post('/driver-allocations', handleCreateAllocation);

// === SERVICE REQUESTS ===
const handleGetRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({}).sort({ createdAt: -1 });
    
    if (req.path.startsWith('/api')) {
      res.json(requests); // Web app format
    } else {
      res.json({ success: true, data: requests }); // Mobile format
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/getRequest', handleGetRequests);
app.get('/vehicle-preparations', handleGetRequests);

app.get('/api/getRequest/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/getCompletedRequests', async (req, res) => {
  try {
    const completedRequests = await ServiceRequest.find({ status: 'Completed' }).sort({ createdAt: -1 });
    res.json(completedRequests);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const handleCreateRequest = async (req, res) => {
  try {
    const requestData = req.body;
    const newRequest = new ServiceRequest(requestData);
    await newRequest.save();
    res.json({ success: true, data: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/createRequest', handleCreateRequest);
app.post('/vehicle-preparations', handleCreateRequest);

// === VEHICLES ===
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({});
    res.json({ success: true, vehicles }); // Mobile app expects this format
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/vehicles', async (req, res) => {
  try {
    const vehicleData = req.body;
    
    const existingVehicle = await Vehicle.findOne({ vin: vehicleData.vin });
    if (existingVehicle) {
      const updatedVehicle = await Vehicle.findOneAndUpdate(
        { vin: vehicleData.vin },
        vehicleData,
        { new: true }
      );
      res.json({ success: true, vehicle: updatedVehicle });
    } else {
      const newVehicle = new Vehicle(vehicleData);
      await newVehicle.save();
      res.json({ success: true, vehicle: newVehicle });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vehicle tracking endpoints
app.get('/vehicles/unit/:unitId', async (req, res) => {
  try {
    const unitId = decodeURIComponent(req.params.unitId);
    console.log(`[VEHICLES] Searching for vehicle: ${unitId}`);
    
    // Try to find real vehicle first
    let vehicle = await Vehicle.findOne({ unitId });
    
    if (!vehicle) {
      // Return mock data for tracking
      vehicle = {
        unitId: unitId,
        location: {
          lat: 14.5995 + (Math.random() - 0.5) * 0.01,
          lng: 120.9842 + (Math.random() - 0.5) * 0.01
        },
        status: 'active',
        lastUpdate: new Date().toISOString()
      };
    }
    
    res.json(vehicle);
  } catch (err) {
    console.error(`[VEHICLES] Error:`, err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/vehicles/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/vehicles/:id', async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const { location } = req.body;
    
    console.log(`[VEHICLES] Updating vehicle ${id} location:`, location);
    
    // Try to update real vehicle
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id, 
      { location }, 
      { new: true }
    );
    
    res.json({ 
      success: true, 
      message: 'Vehicle location updated',
      vehicle: updatedVehicle || { id, location }
    });
  } catch (err) {
    console.error(`[VEHICLES] Update error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// === DASHBOARD STATS ===
app.get('/dashboard/stats', async (req, res) => {
  try {
    const totalStocks = await Inventory.countDocuments();
    const finishedVehiclePreps = await ServiceRequest.countDocuments({ status: 'Completed' });
    const ongoingShipments = await DriverAllocation.countDocuments({ status: 'In Transit' });
    const ongoingVehiclePreps = await ServiceRequest.countDocuments({ status: 'In Progress' });
    const recentVehiclePreps = await ServiceRequest.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    res.json({
      totalStocks,
      finishedVehiclePreps,
      ongoingShipments,
      ongoingVehiclePreps,
      recentVehiclePreps,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === ROOT ROUTES ===
app.get('/', (req, res) => {
  res.send('I-Track Backend is running 🚀 (FIXED VERSION)');
});

app.get('/test', (req, res) => {
  res.send('Server test successful! (FIXED VERSION)');
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 8000;

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Starting server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📚 UNIFIED ENDPOINTS (Support both web and mobile):');
  console.log('  === AUTHENTICATION ===');
  console.log('  - POST /api/login & /login');
  console.log('  - POST /api/logout');
  console.log('  - GET  /api/checkAuth');
  console.log('  === USER MANAGEMENT ===');
  console.log('  - GET  /api/getUsers & /admin/users');
  console.log('  - POST /api/createUser & /admin/create-user');
  console.log('  - DELETE /api/deleteUser/:id');
  console.log('  - GET  /admin/managers');
  console.log('  === INVENTORY ===');
  console.log('  - GET  /api/getStock & /vehicle-stocks');
  console.log('  - POST /api/createStock & /vehicle-stocks');
  console.log('  === DRIVER ALLOCATIONS ===');
  console.log('  - GET  /api/getAllocation & /driver-allocations');
  console.log('  - POST /api/createAllocation & /driver-allocations');
  console.log('  === SERVICE REQUESTS ===');
  console.log('  - GET  /api/getRequest & /vehicle-preparations');
  console.log('  - POST /api/createRequest & /vehicle-preparations');
  console.log('  - GET  /api/getRequest/:id');
  console.log('  - GET  /api/getCompletedRequests');
  console.log('  === VEHICLES ===');
  console.log('  - GET  /vehicles');
  console.log('  - POST /vehicles');
  console.log('  - GET  /vehicles/unit/:unitId');
  console.log('  - GET  /vehicles/:id');
  console.log('  - PATCH /vehicles/:id');
  console.log('  === DASHBOARD ===');
  console.log('  - GET  /dashboard/stats');
  console.log('✅ FIXED Server initialization complete!');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try using a different port: PORT=5001 node server-fixed.js');
    process.exit(1);
  } else {
    console.error('🔥 Server error:', err);
  }
});

// ================== ERROR HANDLING ==================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
