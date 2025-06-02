const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Enable CORS for all origins (adjust if needed)
app.use(cors());
app.use(express.json());

// Import route handlers (make sure these files exist and export routers)
const serviceRequestRoutes = require('./routes/servicerequestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const driverAllocationRoutes = require('./routes/driverallocationRoutes');

// MongoDB connection string
const mongoURI = 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB Atlas
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['Admin', 'Supervisor', 'Manager', 'Sales Agent', 'Driver', 'Dispatch'],
    default: 'Sales Agent'
  },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const VehicleSchema = new mongoose.Schema({
  vin: String,
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
});

const VehicleStockSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
}, { timestamps: true });

const VehiclePreparationSchema = new mongoose.Schema({
  dateCreated: Date,
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
}, { timestamps: true });

// Compile models ONLY if they don’t already exist
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
const VehicleStock = mongoose.models.VehicleStock || mongoose.model('VehicleStock', VehicleStockSchema);
const VehiclePreparation = mongoose.models.VehiclePreparation || mongoose.model('VehiclePreparation', VehiclePreparationSchema);
const DriverAllocation = mongoose.models.DriverAllocation || mongoose.model('DriverAllocation', DriverAllocationSchema);

// Helper to capitalize words
function capitalizeWords(string) {
  if (!string) return '';
  return string
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// === ROUTES ===

// AUTH route
app.post('/login', async (req, res) => {
  try {
    let { username, password, role } = req.body;
    console.log('📥 Login Attempt:', { username, role });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username' });

    const allowedRoles = ['admin', 'manager', 'supervisor', 'sales agent', 'driver', 'dispatch'];

    if (role) {
      const roleLower = role.toLowerCase();

      if (!allowedRoles.includes(roleLower)) {
        return res.status(400).json({ success: false, message: 'Unknown role received' });
      }

      if (user.role.toLowerCase() !== roleLower) {
        return res.status(403).json({ success: false, message: 'Role mismatch' });
      }
    }

    if (password !== user.password) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const formattedRole = capitalizeWords(user.role);

    res.json({
      success: true,
      role: formattedRole,
      name: user.accountName,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ADMIN USER MANAGEMENT
app.post('/admin/assign', async (req, res) => {
  try {
    const { username, password, role, assignedTo, accountName } = req.body;
    if (!username || !password || !role || !accountName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ success: false, message: 'Username already exists' });

    const newUser = new User({
      username,
      password,
      role,
      assignedTo: assignedTo || null,
      accountName,
    });

    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error while creating user', error: err.message });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

app.delete('/admin/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

app.get('/admin/managers', async (req, res) => {
  try {
    const managers = await User.find({ role: 'Manager' });
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching managers', error: err.message });
  }
});

app.put('/admin/change-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating password', error: err.message });
  }
});

// VEHICLE ROUTES
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicles', error: err.message });
  }
});

app.get('/vehicles/:vin', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vin: req.params.vin });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicle', error: err.message });
  }
});

app.post('/vehicles', async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Error adding vehicle', error: err.message });
  }
});

app.put('/vehicles/:vin/update-status', async (req, res) => {
  try {
    const { stage } = req.body;
    const update = {};
    update[`preparation_status.${stage}`] = true;

    const vehicle = await Vehicle.findOneAndUpdate(
      { vin: req.params.vin },
      { $set: update },
      { new: true }
    );

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

app.put('/vehicles/:vin/update-requested', async (req, res) => {
  try {
    const { requested_processes } = req.body;
    const vehicle = await Vehicle.findOneAndUpdate(
      { vin: req.params.vin },
      { requested_processes },
      { new: true }
    );

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Error updating requested processes', error: err.message });
  }
});

app.delete('/vehicles/:vin/delete', async (req, res) => {
  try {
    const deleted = await Vehicle.findOneAndDelete({ vin: req.params.vin });
    if (!deleted) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vehicle', error: err.message });
  }
});

// VEHICLE STOCKS ROUTES
app.get('/vehicle-stocks', async (req, res) => {
  try {
    const stocks = await VehicleStock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicle stocks', error: err.message });
  }
});

app.post('/vehicle-stocks', async (req, res) => {
  try {
    const stock = new VehicleStock(req.body);
    await stock.save();
    res.json({ success: true, stock });
  } catch (err) {
    res.status(500).json({ message: 'Error adding vehicle stock', error: err.message });
  }
});

// VEHICLE PREPARATIONS ROUTES
app.get('/vehicle-preparations', async (req, res) => {
  try {
    const preparations = await VehiclePreparation.find();
    res.json(preparations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicle preparations', error: err.message });
  }
});

app.post('/vehicle-preparations', async (req, res) => {
  try {
    const prep = new VehiclePreparation(req.body);
    await prep.save();
    res.json({ success: true, preparation: prep });
  } catch (err) {
    res.status(500).json({ message: 'Error adding vehicle preparation', error: err.message });
  }
});

// DRIVER ALLOCATIONS ROUTES
app.get('/driver-allocations', async (req, res) => {
  try {
    const allocations = await DriverAllocation.find();
    res.json(allocations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching driver allocations', error: err.message });
  }
});

app.post('/driver-allocations', async (req, res) => {
  try {
    const allocation = new DriverAllocation(req.body);
    await allocation.save();
    res.json({ success: true, allocation });
  } catch (err) {
    res.status(500).json({ message: 'Error adding driver allocation', error: err.message });
  }
});

// SERVICE REQUEST ROUTES
app.use('/', serviceRequestRoutes);
app.use('/', inventoryRoutes);
app.use('/', driverAllocationRoutes);

// TEST ROUTE
app.get('/test', (req, res) => {
  res.send('Server test successful!');
});

// START SERVER
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
