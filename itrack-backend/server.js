const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');

const app = express();

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'itrack-mobile-session-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

app.use(cors({
  credentials: true,
  origin: true // Configure properly for production
}));
app.use(express.json());

// API Configuration for I-Track Mobile App
const API_CONFIG = {
  // Development Mobile Backend (current)
  MOBILE_BACKEND: {
    BASE_URL: 'http://192.168.254.147:5000',
    NAME: 'Mobile Development Backend'
  },
  
  // Production Render Backend
  RENDER_BACKEND: {
    BASE_URL: 'https://itrack-backend-1.onrender.com',
    NAME: 'Render Production Backend'
  }
};

// Current active backend - Use local development backend
const ACTIVE_BACKEND = API_CONFIG.MOBILE_BACKEND;

// Helper function to build full API URL
const buildApiUrl = (endpoint) => {
  return `${ACTIVE_BACKEND.BASE_URL}${endpoint}`;
};

console.log(`📱 Mobile App connected to: ${ACTIVE_BACKEND.NAME}`);
console.log(`🔗 Base URL: ${ACTIVE_BACKEND.BASE_URL}`);

// ==================== EMAIL CONFIGURATION ====================

// Gmail configuration for sending emails
let transporter;

function initializeEmailService() {
  console.log('📧 Initializing Gmail service...');
  
  const emailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'your-email@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
    }
  };

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('⚠️  Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    console.log('📝 To set up Gmail App Password:');
    console.log('   1. Go to Google Account settings');
    console.log('   2. Enable 2-Factor Authentication');
    console.log('   3. Generate an App Password for "Mail"');
    console.log('   4. Set GMAIL_USER=your-email@gmail.com');
    console.log('   5. Set GMAIL_APP_PASSWORD=your-16-digit-app-password');
    return;
  }

  try {
    transporter = nodemailer.createTransporter(emailConfig);
    console.log('✅ Gmail service initialized successfully');
    
    // Test the connection
    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ Gmail connection failed:', error.message);
      } else {
        console.log('✅ Gmail is ready to send emails');
      }
    });
  } catch (error) {
    console.error('❌ Failed to initialize Gmail service:', error);
  }
}

// Initialize email service
initializeEmailService();

// Email sending utility function
async function sendPasswordResetEmail(userEmail, username, temporaryPassword) {
  if (!transporter) {
    console.log('❌ Email service not configured');
    return { success: false, message: 'Email service not configured' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .temp-password { background: #fff; padding: 20px; border: 2px solid #667eea; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 2px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset - I-Track Mobile</h1>
                <p>Temporary access credentials</p>
            </div>
            <div class="content">
                <h2>Hello ${username},</h2>
                <p>You have requested a password reset for your I-Track Mobile account. Here are your temporary login credentials:</p>
                
                <div class="temp-password">
                    ${temporaryPassword}
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Security Notice:</strong>
                    <ul>
                        <li>This temporary password expires in 1 hour</li>
                        <li>You will be required to change your password immediately after logging in</li>
                        <li>Do not share this password with anyone</li>
                        <li>If you didn't request this reset, please contact your administrator</li>
                    </ul>
                </div>
                
                <h3>Next Steps:</h3>
                <ol>
                    <li>Open your I-Track Mobile app</li>
                    <li>Log in using your username and the temporary password above</li>
                    <li>You will be prompted to set a new permanent password</li>
                    <li>Choose a strong password with at least 8 characters</li>
                </ol>
                
                <div class="footer">
                    <p>This email was sent automatically by I-Track Mobile System</p>
                    <p>If you need assistance, please contact your system administrator</p>
                    <p><strong>I-Track Mobile © ${new Date().getFullYear()}</strong></p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"I-Track Mobile System" <${process.env.GMAIL_USER}>`,
    to: userEmail,
    subject: '🔐 I-Track Mobile - Password Reset Request',
    html: htmlContent,
    text: `Hello ${username},\n\nYour temporary password for I-Track Mobile is: ${temporaryPassword}\n\nThis password expires in 1 hour. Please log in and change your password immediately.\n\nI-Track Mobile System`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully to:', userEmail);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, message: 'Failed to send email', error: error.message };
  }
}

// MongoDB URI for your MongoDB Atlas cluster
const mongoURI = 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema with Role Validation and Enhanced Password Management
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Dispatch', 'Driver', 'Supervisor', 'Manager', 'SalesAgent'], default: 'SalesAgent' },
  accountName: { type: String, required: true },
  email: { type: String, required: false }, // For password reset functionality
  name: { type: String, required: false }, // Additional name field
  isActive: { type: Boolean, default: true },
  profilePicture: { type: String, default: null },
  phoneNumber: { type: String, required: false },
  phoneno: { type: String, required: false }, // Alternative phone field for compatibility
  createdBy: { type: String, default: 'System' },
  updatedBy: { type: String, default: 'System' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Enhanced password management fields
  temporaryPassword: { type: String },
  temporaryPasswordExpires: { type: Date },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', UserSchema);

// Vehicle Schema
const VehicleSchema = new mongoose.Schema({
  vin: String,
  unitId: String, // Added for consistency with DriverAllocation
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
  customer_name: String, // Added for agent dashboard
  customer_number: String, // Added for agent dashboard
});
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

// Driver Allocation Schema (enhanced for dispatch functionality)
const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  assignedAgent: String,
  status: { type: String, default: 'Pending' },
  allocatedBy: String,
  
  // Process management
  requestedProcesses: [String],
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
  },
  
  // Progress tracking
  overallProgress: {
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: false }
  },
  
  // Release management
  readyForRelease: { type: Boolean, default: false },
  releasedAt: Date,
  releasedBy: String,
  
  date: { type: Date, default: Date.now }
}, { timestamps: true });
const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema);

// ======================== AUTH =========================

// Enhanced Login with Temporary Password Support
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📥 Login attempt:', username);

    // Check admin credentials first
    if (username === 'isuzupasigadmin' && password === 'Isuzu_Pasig1') {
      req.session.user = {
        username: 'isuzupasigadmin',
        role: 'Admin',
        accountName: 'Isuzu Pasig Admin'
      };
      return res.json({ 
        success: true, 
        user: {
          role: 'Admin', 
          accountName: 'Isuzu Pasig Admin',
          email: 'admin@isuzupasig.com'
        }
      });
    }

    // Find user in database by email or username
    const user = await User.findOne({
      $or: [
        { email: username.toLowerCase().trim() },
        { username: username.toLowerCase().trim() }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or username' });
    }

    let isValidLogin = false;
    let isTemporaryPassword = false;

    // Check if using temporary password
    if (user.temporaryPassword && 
        user.temporaryPasswordExpires && 
        user.temporaryPasswordExpires > Date.now()) {
      
      if (password === user.temporaryPassword) {
        isValidLogin = true;
        isTemporaryPassword = true;
        
        console.log('🔑 User logged in with temporary password:', username);
        
        // Clear temporary password after successful use
        user.temporaryPassword = undefined;
        user.temporaryPasswordExpires = undefined;
        await user.save();
      }
    }

    // If not using temporary password, check regular password
    if (!isValidLogin) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        isValidLogin = true;
        console.log('🔑 User logged in with regular password:', username);
      }
    }

    if (!isValidLogin) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create session
    const sessionUser = {
      id: user._id,
      username: user.username,
      role: user.role,
      accountName: user.accountName,
      name: user.name || user.accountName,
      email: user.email,
      assignedTo: user.assignedTo
    };

    req.session.user = sessionUser;

    const response = {
      success: true,
      user: {
        role: user.role,
        accountName: user.accountName,
        name: user.name || user.accountName,
        email: user.email,
        username: user.username
      }
    };

    // If temporary password was used, notify frontend to prompt password change
    if (isTemporaryPassword) {
      response.requirePasswordChange = true;
      response.message = 'Login successful with temporary password. Please change your password immediately.';
      console.log('⚠️  User should change password immediately:', username);
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ==================== PASSWORD MANAGEMENT ROUTES ====================

// Forgot Password - Send temporary password via email
app.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    console.log('🔑 Forgot password request for:', username);

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'If the username exists and has an email, a temporary password has been sent.' 
      });
    }

    if (!user.email) {
      return res.json({ 
        success: true, 
        message: 'If the username exists and has an email, a temporary password has been sent.' 
      });
    }

    // Generate temporary password (8 characters, alphanumeric)
    const temporaryPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save temporary password to user
    user.temporaryPassword = temporaryPassword;
    user.temporaryPasswordExpires = expiresAt;
    await user.save();

    // Send email with temporary password
    const emailResult = await sendPasswordResetEmail(user.email, user.username, temporaryPassword);
    
    if (emailResult.success) {
      console.log('✅ Temporary password sent to:', user.email);
      res.json({ 
        success: true, 
        message: 'Temporary password sent to your email address. Please check your inbox.' 
      });
    } else {
      console.error('❌ Failed to send email:', emailResult.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send email. Please contact administrator.' 
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change Password - For logged-in users
app.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    console.log('🔐 Change password request for user:', req.session?.user?.username);

    // Check if user is logged in
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log('✅ Password changed successfully for user:', user.username);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user info (for profile)
app.get('/profile', (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    res.json({ 
      success: true, 
      user: req.session.user 
    });
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  try {
    console.log('👋 Logout request from:', req.session?.user?.username);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ success: false, message: 'Could not log out' });
      }
      
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// (Other routes remain unchanged...)

// ========== USER MANAGEMENT ENDPOINTS ==========

// Get all users
app.get('/getUsers', async (req, res) => {
  try {
    const users = await User.find({}).select('-password -temporaryPassword');
    console.log(`📊 Found ${users.length} users`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new user
app.post('/createUser', async (req, res) => {
  try {
    const { username, password, role, accountName, email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      role: role || 'salesAgent',
      accountName,
      email
    });
    
    await newUser.save();
    console.log('✅ Created user:', newUser.username);
    
    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.temporaryPassword;
    
    res.json({ success: true, message: 'User created successfully', data: userResponse });
  } catch (error) {
    console.error('❌ Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
app.put('/updateUser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.temporaryPassword;
    
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password -temporaryPassword');
    
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

// Delete user
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== INVENTORY/STOCK MANAGEMENT ENDPOINTS ==========

// Inventory Schema
const InventorySchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  conductionNumber: String,
  quantity: { type: Number, default: 1 },
  status: { type: String, default: 'Available' }
}, { timestamps: true });
const Inventory = mongoose.model('Inventory', InventorySchema);

// Get all stock/inventory
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

// Create new stock item
app.post('/createStock', async (req, res) => {
  try {
    const { unitName, unitId, bodyColor, variation, conductionNumber, quantity } = req.body;
    
    const newStock = new Inventory({
      unitName,
      unitId: unitId || unitName,
      bodyColor,
      variation,
      conductionNumber: conductionNumber || unitId,
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

// Update stock item
app.put('/updateStock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedStock = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedStock) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }
    
    console.log('✅ Updated stock:', updatedStock.unitName);
    res.json({ success: true, message: 'Stock updated successfully', data: updatedStock });
  } catch (error) {
    console.error('❌ Update stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete stock item
app.delete('/deleteStock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedStock = await Inventory.findByIdAndDelete(id);
    
    if (!deletedStock) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }
    
    console.log('✅ Deleted stock:', deletedStock.unitName);
    res.json({ success: true, message: 'Stock deleted successfully' });
  } catch (error) {
    console.error('❌ Delete stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DRIVER ALLOCATION ENDPOINTS ==========

// Get all allocations
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

// Create new allocation
app.post('/createAllocation', async (req, res) => {
  try {
    const allocationData = req.body;
    console.log('📋 Creating allocation:', allocationData);
    
    const newAllocation = new DriverAllocation(allocationData);
    await newAllocation.save();
    
    console.log('✅ Created allocation:', newAllocation.unitName);
    res.json({ success: true, message: 'Allocation created successfully', data: newAllocation });
  } catch (error) {
    console.error('❌ Create allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DISPATCH ASSIGNMENT ENDPOINTS ==========

// Get dispatch assignments
app.get('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Fetching dispatch assignments...');
    
    // Use DriverAllocation model for dispatch assignments
    const assignments = await DriverAllocation.find({
      status: { $in: ['Assigned to Dispatch', 'In Progress', 'Ready for Release'] }
    }).sort({ createdAt: -1 });
    
    // Format the data for dispatch view
    const dispatchData = assignments.map(allocation => ({
      _id: allocation._id,
      unitName: allocation.unitName,
      unitId: allocation.unitId,
      bodyColor: allocation.bodyColor,
      variation: allocation.variation,
      assignedDriver: allocation.assignedDriver,
      assignedAgent: allocation.assignedAgent,
      status: allocation.status,
      allocatedBy: allocation.allocatedBy,
      
      // Process management for dispatch checklist
      requestedProcesses: allocation.requestedProcesses || [],
      processStatus: allocation.processStatus || {
        tinting: false,
        carwash: false,
        ceramic_coating: false,
        accessories: false,
        rust_proof: false
      },
      
      processes: allocation.requestedProcesses || [],
      processCompletedBy: allocation.processCompletedBy || {},
      processCompletedAt: allocation.processCompletedAt || {},
      
      overallProgress: allocation.overallProgress || {
        completed: 0,
        total: 0,
        isComplete: false
      },
      
      readyForRelease: allocation.readyForRelease || false,
      releasedAt: allocation.releasedAt,
      releasedBy: allocation.releasedBy,
      
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt
    }));
    
    console.log(`✅ Found ${dispatchData.length} dispatch assignments`);
    
    res.json({
      success: true,
      data: dispatchData,
      count: dispatchData.length
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

// Create new dispatch assignment
app.post('/api/dispatch/assignments', async (req, res) => {
  try {
    console.log('📋 Creating dispatch assignment:', req.body);
    
    const assignmentData = req.body;
    
    // Create new allocation with dispatch status
    const newAssignment = new DriverAllocation({
      ...assignmentData,
      status: 'Assigned to Dispatch',
      requestedProcesses: assignmentData.processes || [],
      processStatus: {},
      date: new Date()
    });
    
    // Initialize process status
    if (assignmentData.processes && Array.isArray(assignmentData.processes)) {
      const processStatus = {};
      assignmentData.processes.forEach(processId => {
        processStatus[processId] = false;
      });
      newAssignment.processStatus = processStatus;
    }
    
    const savedAssignment = await newAssignment.save();
    
    console.log('✅ Dispatch assignment created:', savedAssignment._id);
    res.json({ 
      success: true, 
      message: 'Dispatch assignment created successfully',
      data: savedAssignment 
    });
    
  } catch (error) {
    console.error('❌ Create dispatch assignment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create dispatch assignment',
      details: error.message 
    });
  }
});

// Update dispatch assignment process
app.put('/api/dispatch/assignments/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processId, completed, completedBy } = req.body;
    
    console.log(`📋 Updating process ${processId} for assignment ${id}:`, { completed, completedBy });
    
    const assignment = await DriverAllocation.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Dispatch assignment not found'
      });
    }
    
    // Update process status
    if (!assignment.processStatus) {
      assignment.processStatus = {};
    }
    assignment.processStatus[processId] = completed;
    
    // Update completion tracking
    if (!assignment.processCompletedBy) {
      assignment.processCompletedBy = {};
    }
    if (!assignment.processCompletedAt) {
      assignment.processCompletedAt = {};
    }
    
    if (completed) {
      assignment.processCompletedBy[processId] = completedBy;
      assignment.processCompletedAt[processId] = new Date();
    } else {
      delete assignment.processCompletedBy[processId];
      delete assignment.processCompletedAt[processId];
    }
    
    // Calculate overall progress
    const totalProcesses = assignment.requestedProcesses?.length || 0;
    const completedProcesses = Object.values(assignment.processStatus || {}).filter(status => status === true).length;
    
    assignment.overallProgress = {
      completed: completedProcesses,
      total: totalProcesses,
      isComplete: completedProcesses === totalProcesses && totalProcesses > 0
    };
    
    // Update status based on progress
    if (assignment.overallProgress.isComplete) {
      assignment.status = 'Ready for Release';
      assignment.readyForRelease = true;
    } else if (completedProcesses > 0) {
      assignment.status = 'In Progress';
    }
    
    const updatedAssignment = await assignment.save();
    
    console.log('✅ Process updated successfully');
    res.json({
      success: true,
      data: updatedAssignment,
      message: 'Process status updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating dispatch process:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update process',
      details: error.message
    });
  }
});

// Update dispatch assignment
app.put('/api/dispatch/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`📋 Updating dispatch assignment ${id}:`, updateData);
    
    const updatedAssignment = await DriverAllocation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedAssignment) {
      return res.status(404).json({
        success: false,
        error: 'Dispatch assignment not found'
      });
    }
    
    console.log('✅ Dispatch assignment updated:', updatedAssignment);
    
    res.json({
      success: true,
      data: updatedAssignment,
      message: 'Dispatch assignment updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating dispatch assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update dispatch assignment',
      details: error.message
    });
  }
});

// Delete dispatch assignment
app.delete('/api/dispatch/assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Deleting dispatch assignment ${id}`);
    
    const deletedAssignment = await DriverAllocation.findByIdAndDelete(id);
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

// ========== VEHICLE ROUTES FOR DRIVER DASHBOARD ==========

// Get vehicle by unitId (for driver dashboard)
app.get('/vehicles/unit/:unitId', async (req, res) => {
  try {
    console.log(`Looking for vehicle with unitId: ${req.params.unitId}`);
    
    // Try to find by unitId first, then fallback to vin
    let vehicle = await Vehicle.findOne({ unitId: req.params.unitId });
    if (!vehicle) {
      vehicle = await Vehicle.findOne({ vin: req.params.unitId });
    }
    
    if (!vehicle) {
      console.log(`Vehicle not found for unitId: ${req.params.unitId}`);
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    
    console.log(`Found vehicle:`, vehicle);
    res.json(vehicle);
  } catch (err) {
    console.error('Error fetching vehicle by unitId:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update vehicle location by unitId (for driver dashboard)
app.patch('/vehicles/:unitId', async (req, res) => {
  try {
    const { location } = req.body;
    console.log(`Updating location for unitId: ${req.params.unitId}`, location);
    
    // Try to update by unitId first, then fallback to vin
    let vehicle = await Vehicle.findOneAndUpdate(
      { unitId: req.params.unitId },
      { $set: { location } },
      { new: true }
    );
    
    if (!vehicle) {
      vehicle = await Vehicle.findOneAndUpdate(
        { vin: req.params.unitId },
        { $set: { location } },
        { new: true, upsert: true }
      );
    }
    
    console.log('Updated vehicle location:', vehicle);
    res.json({ success: true, vehicle });
  } catch (err) {
    console.error('Error updating vehicle location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all vehicles (for general use)
app.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json({ success: true, vehicles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create or update vehicle (for agent dashboard)
app.post('/vehicles', async (req, res) => {
  try {
    console.log('Creating/updating vehicle:', req.body);
    
    const existing = await Vehicle.findOne({ vin: req.body.vin });
    if (existing) {
      Object.assign(existing, req.body);
      await existing.save();
      return res.json({ success: true, vehicle: existing });
    }

    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.json({ success: true, vehicle });
  } catch (err) {
    console.error('Error creating vehicle:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== DRIVER ALLOCATION ROUTES ==========

// Get driver allocations (with filtering for specific driver)
app.get('/driver-allocations', async (req, res) => {
  try {
    const { assignedDriver } = req.query;
    let query = {};
    
    // Filter by assigned driver if provided
    if (assignedDriver) {
      query.assignedDriver = assignedDriver;
    }
    
    console.log('Driver allocations query:', query);
    const allocations = await DriverAllocation.find(query);
    console.log('Found allocations:', allocations.length);
    
    res.json({ success: true, data: allocations });
  } catch (err) {
    console.error('Error fetching driver allocations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create driver allocation
app.post('/driver-allocations', async (req, res) => {
  try {
    console.log('Creating driver allocation:', req.body);
    const newAllocation = new DriverAllocation(req.body);
    await newAllocation.save();
    res.json({ success: true, allocation: newAllocation });
  } catch (err) {
    console.error('Error creating driver allocation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update driver allocation status
app.patch('/driver-allocations/:id', async (req, res) => {
  try {
    console.log(`Updating allocation ${req.params.id} with:`, req.body);
    const updated = await DriverAllocation.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Allocation not found' });
    res.json({ success: true, allocation: updated });
  } catch (err) {
    console.error('Error updating driver allocation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== SERVICE REQUEST ENDPOINTS ==========

// Service Request Schema
const ServiceRequestSchema = new mongoose.Schema({
  vehicleId: String,
  unitName: String,
  unitId: String,
  requestType: String,
  description: String,
  requestedBy: String,
  status: { type: String, default: 'Pending' },
  priority: { type: String, default: 'Normal' },
  completedAt: Date,
  completedBy: String
}, { timestamps: true });
const Servicerequest = mongoose.model('Servicerequest', ServiceRequestSchema);

// Get service requests
app.get('/getRequest', async (req, res) => {
  try {
    const requests = await Servicerequest.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${requests.length} service requests`);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('❌ Get requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get completed requests
app.get('/getCompletedRequests', async (req, res) => {
  try {
    const completedRequests = await Servicerequest.find({ status: 'Completed' }).sort({ completedAt: -1 });
    console.log(`📊 Found ${completedRequests.length} completed requests`);
    res.json({ success: true, data: completedRequests });
  } catch (error) {
    console.error('❌ Get completed requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DASHBOARD STATISTICS ==========

// Dashboard stats endpoint
app.get('/dashboard/stats', async (req, res) => {
  try {
    const totalStocks = await Inventory.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAllocations = await DriverAllocation.countDocuments();
    const completedRequests = await Servicerequest.countDocuments({ status: 'Completed' });
    const pendingRequests = await Servicerequest.countDocuments({ status: 'Pending' });
    const inTransitVehicles = await DriverAllocation.countDocuments({ status: 'In Transit' });
    const readyForRelease = await DriverAllocation.countDocuments({ readyForRelease: true });
    
    const stats = {
      totalStocks,
      totalUsers,
      totalAllocations,
      finishedVehiclePreps: completedRequests,
      ongoingVehiclePreps: pendingRequests,
      ongoingShipments: inTransitVehicles,
      readyForRelease,
      recentVehiclePreps: await Servicerequest.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    };
    
    console.log('📊 Dashboard stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== INVENTORY API ENDPOINT ==========

// Update inventory item (for status changes)
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`📋 Updating inventory ${id}:`, updateData);
    
    const updatedItem = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }
    
    console.log('✅ Inventory updated:', updatedItem);
    res.json({ 
      success: true, 
      data: updatedItem,
      message: 'Inventory updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inventory',
      details: error.message
    });
  }
});

// ========== RELEASE MANAGEMENT ==========

// Get releases
app.get('/api/releases', async (req, res) => {
  try {
    const releases = await DriverAllocation.find({ 
      status: 'Released',
      releasedAt: { $exists: true }
    }).sort({ releasedAt: -1 });
    
    console.log(`📊 Found ${releases.length} releases`);
    res.json({ success: true, data: releases });
  } catch (error) {
    console.error('❌ Get releases error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Confirm release
app.post('/api/releases', async (req, res) => {
  try {
    const releaseData = req.body;
    console.log('📋 Confirming vehicle release:', releaseData);
    
    // Update the allocation to released status
    const updatedAllocation = await DriverAllocation.findByIdAndUpdate(
      releaseData.vehicleId,
      {
        status: 'Released',
        releasedAt: releaseData.releasedAt,
        releasedBy: releaseData.releasedBy
      },
      { new: true }
    );
    
    if (!updatedAllocation) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle allocation not found'
      });
    }
    
    console.log('✅ Vehicle released successfully:', updatedAllocation);
    res.json({ 
      success: true, 
      data: updatedAllocation,
      message: 'Vehicle released successfully' 
    });
  } catch (error) {
    console.error('❌ Release confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm release',
      details: error.message
    });
  }
});

// ========== TEST DATA CREATION ==========

// Create sample data for testing
app.post('/test/create-sample-data', async (req, res) => {
  try {
    console.log('Creating sample data for testing...');
    
    // Create sample driver allocation
    const sampleAllocation = new DriverAllocation({
      unitName: 'Isuzu D-Max',
      unitId: 'TEST001',
      bodyColor: 'Red',
      variation: 'LS-A 4x2',
      assignedDriver: 'Driver A',
      status: 'Pending'
    });
    await sampleAllocation.save();
    
    // Create sample vehicle with location
    const sampleVehicle = new Vehicle({
      vin: 'TEST001',
      unitId: 'TEST001',
      model: 'D-Max',
      driver: 'Driver A',
      current_status: 'Ready',
      location: { lat: 14.5791, lng: 121.0655 }, // Isuzu Pasig location
      customer_name: 'Test Customer',
      customer_number: '09123456789'
    });
    await sampleVehicle.save();
    
    console.log('Sample data created successfully');
    res.json({ 
      success: true, 
      message: 'Sample data created',
      allocation: sampleAllocation,
      vehicle: sampleVehicle
    });
  } catch (err) {
    console.error('Error creating sample data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Configuration endpoint
app.get('/api/config', (req, res) => {
  const baseUrl = `http://${req.get('host')}`;
  
  res.json({
    success: true,
    config: {
      baseUrl,
      version: '2.0.0',
      name: 'I-Track Mobile Backend',
      endpoints: {
        // Authentication
        login: '/login',
        forgotPassword: '/forgot-password',
        changePassword: '/change-password',
        logout: '/logout',
        profile: '/profile',
        
        // User Management
        getUsers: '/getUsers',
        createUser: '/createUser',
        updateUser: '/updateUser/:id',
        deleteUser: '/deleteUser/:id',
        
        // Vehicle Management
        getAllocation: '/getAllocation',
        createAllocation: '/createAllocation',
        
        // Inventory & Stock
        getStock: '/getStock',
        createStock: '/createStock',
        updateStock: '/updateStock/:id',
        deleteStock: '/deleteStock/:id',
        updateInventory: '/api/inventory/:id',
        
        // Service Requests
        getRequest: '/getRequest',
        getCompletedRequests: '/getCompletedRequests',
        
        // Dispatch Management
        getDispatchAssignments: '/api/dispatch/assignments',
        createDispatchAssignment: '/api/dispatch/assignments',
        updateDispatchProcess: '/api/dispatch/assignments/:id/process',
        updateDispatchAssignment: '/api/dispatch/assignments/:id',
        deleteDispatchAssignment: '/api/dispatch/assignments/:id',
        
        // Release Management
        getReleases: '/api/releases',
        confirmRelease: '/api/releases',
        
        // Dashboard
        dashboardStats: '/dashboard/stats',
        
        // Vehicle Routes
        getVehicleByUnit: '/vehicles/unit/:unitId',
        updateVehicleLocation: '/vehicles/:unitId',
        getAllVehicles: '/vehicles',
        createVehicle: '/vehicles',
        
        // Driver Allocations
        getDriverAllocations: '/driver-allocations',
        createDriverAllocation: '/driver-allocations',
        updateDriverAllocation: '/driver-allocations/:id',
        
        // Health & Config
        health: '/test',
        config: '/api/config'
      },
      features: {
        userManagement: true,
        inventoryManagement: true,
        dispatchManagement: true,
        releaseManagement: true,
        dashboardStats: true,
        realTimeTracking: true,
        passwordReset: true
      }
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'I-Track Backend Server is running successfully!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'Connected to MongoDB Atlas',
    endpoints: {
      total: 25,
      categories: [
        'Authentication (5)',
        'User Management (4)', 
        'Inventory Management (5)',
        'Dispatch Management (5)',
        'Vehicle Management (4)',
        'Dashboard & Reports (2)'
      ]
    }
  });
});

// Server listening on localhost
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀====================================🚀');
  console.log('    I-TRACK MOBILE BACKEND SERVER    ');
  console.log('🚀====================================🚀');
  console.log('');
  console.log(`🔗 Server running on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://0.0.0.0:${PORT}`);
  console.log(`   - Loopback: http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  🔐 AUTHENTICATION:');
  console.log('    - POST /login');
  console.log('    - POST /forgot-password');
  console.log('    - POST /change-password');
  console.log('    - POST /logout');
  console.log('    - GET  /profile');
  console.log('');
  console.log('  👥 USER MANAGEMENT:');
  console.log('    - GET    /getUsers');
  console.log('    - POST   /createUser');
  console.log('    - PUT    /updateUser/:id');
  console.log('    - DELETE /deleteUser/:id');
  console.log('');
  console.log('  📦 INVENTORY MANAGEMENT:');
  console.log('    - GET    /getStock');
  console.log('    - POST   /createStock');
  console.log('    - PUT    /updateStock/:id');
  console.log('    - DELETE /deleteStock/:id');
  console.log('    - PUT    /api/inventory/:id');
  console.log('');
  console.log('  🚚 VEHICLE & ALLOCATION:');
  console.log('    - GET  /getAllocation');
  console.log('    - POST /createAllocation');
  console.log('    - GET  /vehicles');
  console.log('    - POST /vehicles');
  console.log('    - GET  /vehicles/unit/:unitId');
  console.log('    - PATCH /vehicles/:unitId');
  console.log('');
  console.log('  📋 DISPATCH MANAGEMENT:');
  console.log('    - GET    /api/dispatch/assignments');
  console.log('    - POST   /api/dispatch/assignments');
  console.log('    - PUT    /api/dispatch/assignments/:id/process');
  console.log('    - PUT    /api/dispatch/assignments/:id');
  console.log('    - DELETE /api/dispatch/assignments/:id');
  console.log('');
  console.log('  📤 SERVICE REQUESTS:');
  console.log('    - GET /getRequest');
  console.log('    - GET /getCompletedRequests');
  console.log('');
  console.log('  📦 RELEASE MANAGEMENT:');
  console.log('    - GET  /api/releases');
  console.log('    - POST /api/releases');
  console.log('');
  console.log('  📊 DASHBOARD & STATS:');
  console.log('    - GET /dashboard/stats');
  console.log('    - GET /api/config');
  console.log('');
  console.log('  🩹 DRIVER ALLOCATIONS:');
  console.log('    - GET   /driver-allocations');
  console.log('    - POST  /driver-allocations');
  console.log('    - PATCH /driver-allocations/:id');
  console.log('');
  console.log('  ✅ HEALTH CHECK:');
  console.log('    - GET /test');
  console.log('');
  console.log('✨ All endpoints are now connected to MongoDB Atlas!');
  console.log('📊 Database collections: Users, Inventory, DriverAllocation, Servicerequest, Vehicle');
  console.log('');
  console.log('🔄 Server ready to handle requests...');
  console.log('');
});
