const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PUBLIC_IP = '192.168.254.147';
const mongoURI = 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema with Role Validation
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'manager', 'salesAgent'], default: 'salesAgent' },
  accountName: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to their supervisor/manager
});
const User = mongoose.model('User', UserSchema);

// Vehicle Schema
const VehicleSchema = new mongoose.Schema({
  vin: String,
  model: String,
  driver: String,
  current_status: String,
  requested_processes: [String], // requested processes array
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
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// ======================== AUTH =========================

// Admin Login with Hardcoded Credentials
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded admin login
    if (username === 'isuzupasigadmin' && password === 'Isuzu_Pasig1') {
      return res.json({ success: true, role: 'admin', name: 'Isuzu Pasig Admin' });
    }

    // Otherwise normal user login
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

    res.json({ success: true, role: user.role, name: user.accountName });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ======================== USER ROUTES =========================

// Fetch all Managers under a Supervisor
app.get('/supervisor/:supervisorId/managers', async (req, res) => {
  try {
    const managers = await User.find({ assignedTo: req.params.supervisorId, role: 'manager' });
    res.json(managers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching managers', error: err.message });
  }
});

// Fetch all Sales Agents under a Manager
app.get('/manager/:managerId/salesAgents', async (req, res) => {
  try {
    const salesAgents = await User.find({ assignedTo: req.params.managerId, role: 'salesAgent' });
    res.json(salesAgents);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sales agents', error: err.message });
  }
});

// Admin assigns roles
app.post('/admin/assign', async (req, res) => {
  try {
    const { username, role, assignedTo } = req.body; // `assignedTo` will be the supervisor/manager
    const newUser = new User({ username, role, assignedTo });
    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Server error while assigning user', error: err.message });
  }
});

// Admin changes user password
app.put('/admin/change-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while updating password', error: err.message });
  }
});

// Admin fetch all users
app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Admin delete user
app.delete('/admin/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

// ======================== VEHICLE ROUTES =========================

// Get all vehicles
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single vehicle by VIN
app.get('/vehicles/:vin', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vin: req.params.vin });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add vehicle
app.post('/vehicles/add', async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update preparation status of a vehicle stage
app.put('/vehicles/:vin/update-status', async (req, res) => {
  try {
    const { vin } = req.params;
    const { stage } = req.body;

    const vehicle = await Vehicle.findOne({ vin });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    // Toggle status for flexibility
    const currentStatus = vehicle.preparation_status[stage];
    vehicle.preparation_status[stage] = !currentStatus;

    vehicle.current_status = stage; // Update current status to last stage changed

    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete vehicle
app.delete('/vehicles/:vin/delete', async (req, res) => {
  try {
    await Vehicle.findOneAndDelete({ vin: req.params.vin });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vehicle counts for dashboard stats
app.get('/vehicles/counts', async (req, res) => {
  try {
    const total = await Vehicle.countDocuments();
    const finished = await Vehicle.countDocuments({ 'preparation_status.ready_for_release': true });
    const inShipment = await Vehicle.countDocuments({ current_status: 'In Transit' });
    const inService = await Vehicle.countDocuments({
      $or: [
        { 'preparation_status.tinting': true },
        { 'preparation_status.carwash': true },
        { 'preparation_status.ceramic_coating': true },
        { 'preparation_status.accessories': true },
      ],
      'preparation_status.ready_for_release': false,
    });

    res.json({ total, finished, inShipment, inService });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.send('Server test successful!');
});

// Server listening
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://${PUBLIC_IP}:${PORT}`);
});
