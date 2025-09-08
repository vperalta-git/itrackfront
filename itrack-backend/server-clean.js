console.log('📂 Loading server.js file...');
//sss
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting I-Track Backend Server...');

const app = express();

// Enable CORS for all origins (adjust if needed)
app.use(cors());
app.use(express.json());

// MongoDB connection string
const mongoURI =
  process.env.MONGODB_URI ||
  'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔌 Connecting to MongoDB...');
console.log('MongoDB URI:', mongoURI ? 'Set' : 'Not set');

// Connect to MongoDB Atlas
mongoose
  .connect(mongoURI, {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    connectTimeoutMS: 10000, // 10 seconds
  })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️ Starting server without MongoDB connection...');
  });

// ================== SCHEMAS ==================
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Supervisor', 'Manager', 'Sales Agent', 'Driver', 'Dispatch'],
    default: 'Sales Agent',
  },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

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
});

const VehicleStockSchema = new mongoose.Schema(
  {
    unitName: String,
    conductionNumber: String,
    unitId: String,
    bodyColor: String,
    variation: String,
  },
  { timestamps: true }
);

const VehiclePreparationSchema = new mongoose.Schema(
  {
    dateCreated: Date,
    vehicleRegNo: String,
    service: [{ serviceTime: String, status: String }],
    status: String,
  },
  { timestamps: true }
);

const DriverAllocationSchema = new mongoose.Schema(
  {
    unitName: String,
    conductionNumber: String,
    unitId: String,
    bodyColor: String,
    variation: String,
    assignedDriver: String,
    status: String,
    date: Date,
  },
  { timestamps: true }
);

// ================== MODELS ==================
const User = mongoose.model('User', UserSchema);
const Vehicle = mongoose.model('Vehicle', VehicleSchema);
const VehicleStock = mongoose.model('VehicleStock', VehicleStockSchema);
const VehiclePreparation = mongoose.model('VehiclePreparation', VehiclePreparationSchema);
const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema);

// ================== ROUTES ==================

// === AUTH ===
app.post('/login', async (req, res) => {
  try {
    let { username, password, role } = req.body;
    console.log('📥 Login Attempt:', { username, role });

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Username and password are required' });
    }

    username = username.toLowerCase().trim();

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (password !== user.password)
      return res.status(401).json({ success: false, message: 'Invalid password' });

    if (role && user.role !== role) {
      return res
        .status(403)
        .json({ success: false, message: `Access denied for role: ${role}` });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: user.username,
        role: user.role,
        accountName: user.accountName,
        assignedTo: user.assignedTo,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// === USER MANAGEMENT ===
app.post('/admin/create-user', async (req, res) => {
  try {
    const { username, password, role, assignedTo, accountName } = req.body;
    if (!username || !password || !role || !accountName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newUser = new User({
      username: username.toLowerCase().trim(),
      password,
      role,
      assignedTo,
      accountName,
    });

    await newUser.save();
    res.json({ success: true, message: 'User created successfully', user: newUser });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating user', error: err.message });
  }
});

// === VEHICLES ===
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({});
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === DRIVER ALLOCATIONS ===
app.get('/driver-allocations', async (req, res) => {
  try {
    const allocations = await DriverAllocation.find({});
    res.json({ success: true, data: allocations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// === DASHBOARD STATS ===
app.get('/dashboard/stats', async (req, res) => {
  try {
    const totalStocks = await VehicleStock.countDocuments();
    const finishedVehiclePreps = await VehiclePreparation.countDocuments({ status: 'Completed' });
    const ongoingShipments = await DriverAllocation.countDocuments({ status: 'In Transit' });
    const ongoingVehiclePreps = await VehiclePreparation.countDocuments({ status: 'In Progress' });
    const recentVehiclePreps = await VehiclePreparation.countDocuments({
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

// === TEST ===
app.get('/test', (req, res) => {
  res.send('Server test successful!');
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Starting server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📚 Available endpoints:');
  console.log('  - GET  /test');
  console.log('  - POST /login');
  console.log('  - POST /admin/create-user');
  console.log('  - GET  /vehicles');
  console.log('  - GET  /driver-allocations');
  console.log('  - GET  /dashboard/stats');
  console.log('✅ Server initialization complete!');
});



server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.log('💡 Try using a different port: PORT=5001 node server.js');
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
