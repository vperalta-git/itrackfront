const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ User Schema
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
const User = mongoose.model('User', UserSchema);

// ✅ Vehicle Schema
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
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// ======================== AUTH =========================

app.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    console.log('📥 Login Attempt:', { username, role });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username' });

    if (role && !['Admin', 'Manager', 'Supervisor', 'Sales Agent', 'Driver', 'Dispatch'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Unknown role received' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ success: false, message: 'Role mismatch' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

    res.json({ success: true, role: user.role, name: user.accountName, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ======================== ADMIN USER MGMT =========================

app.post('/admin/assign', async (req, res) => {
  try {
    const { username, password, role, assignedTo, accountName } = req.body;
    if (!username || !password || !role || !accountName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ success: false, message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating password', error: err.message });
  }
});

// ======================== VEHICLE ROUTES =========================

// Get all vehicles
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicles', error: err.message });
  }
});

// Get single vehicle by VIN
app.get('/vehicles/:vin', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vin: req.params.vin });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching vehicle', error: err.message });
  }
});

// Add a new vehicle
app.post('/vehicles', async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(500).json({ message: 'Error adding vehicle', error: err.message });
  }
});

// Update status of one stage
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

// Update requested_processes array
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

// Delete vehicle
app.delete('/vehicles/:vin/delete', async (req, res) => {
  try {
    const deleted = await Vehicle.findOneAndDelete({ vin: req.params.vin });
    if (!deleted) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting vehicle', error: err.message });
  }
});

// ======================== TEST =========================

app.get('/test', (req, res) => {
  res.send('Server test successful!');
});

// ======================== START SERVER =========================

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
