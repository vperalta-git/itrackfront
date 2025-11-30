const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Force deployment refresh - latest version with itrackDB connection
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');

const app = express();

// ========== ENVIRONMENT VARIABLE VALIDATION ==========
console.log('🔍 Checking environment variables...');

// Check if critical variables are set
if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not set - using fallback connection string');
  process.env.MONGODB_URI = 'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';
}

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET not set - using default (NOT SECURE FOR PRODUCTION)');
  process.env.SESSION_SECRET = 'itrack-mobile-session-secret-key-2025';
}

// Optional variables
const optionalVars = ['GOOGLE_MAPS_API_KEY', 'GMAIL_USER', 'GMAIL_APP_PASSWORD'];
const missingOptional = optionalVars.filter(varName => !process.env[varName]);

if (missingOptional.length > 0) {
  console.warn('⚠️  Optional environment variables not set:');
  missingOptional.forEach(varName => console.warn(`   - ${varName}`));
  console.warn('💡 Some features may be limited without these variables');
}

console.log('✅ Environment check complete\n');

// Session configuration - Updated for production security
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Cross-site cookies for production
  }
}));

// CORS configuration - Updated for production security
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://itrack-backend-1.onrender.com',
      'https://your-frontend-domain.com', // Add your frontend domain
      /\.onrender\.com$/ // Allow all Render.com subdomains
    ]
  : true; // Allow all origins in development

app.use(cors({
  credentials: true,
  origin: allowedOrigins
}));
app.use(express.json({ limit: '50mb' })); // Support larger payloads for profile pictures
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Configuration for I-Track Mobile App
const API_CONFIG = {
  // Development Mobile Backend
  MOBILE_BACKEND: {
    BASE_URL: process.env.DEV_BASE_URL || 'http://192.168.254.147:5000',
    NAME: 'Mobile Development Backend'
  },
  
  // Production Render Backend
  RENDER_BACKEND: {
    BASE_URL: process.env.RENDER_EXTERNAL_URL || 'https://itrack-backend-1.onrender.com',
    NAME: 'Render Production Backend'
  }
};

// Dynamic backend selection based on environment
const ACTIVE_BACKEND = process.env.NODE_ENV === 'production' 
  ? API_CONFIG.RENDER_BACKEND 
  : API_CONFIG.MOBILE_BACKEND;

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

  const emailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  };

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

// MongoDB URI configuration - Updated to connect to your itrackDB database
const mongoURI = process.env.MONGODB_URI;

// Connect to MongoDB with retry logic
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema with Role Validation and Enhanced Password Management - SYNCED WITH WEB VERSION
const UserSchema = new mongoose.Schema({
  // Core Authentication Fields
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Admin', 'Manager', 'Sales Agent', 'Driver', 'Supervisor', 'Dispatch'], // Synced with web version
    default: 'Sales Agent'
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  
  // Profile Enhancement Fields (Synced with web)
  picture: {
    type: String, // URL or base64 string
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  secondaryPhone: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  
  // Employment Information (Synced with web)
  employeeId: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Reference to manager
  },
  
  // Emergency Contact (Synced with web)
  emergencyContact: {
    type: String,
    trim: true
  },
  emergencyPhone: {
    type: String,
    trim: true
  },
  
  // Address (Synced with web)
  address: {
    type: String,
    maxlength: 300
  },
  
  // Password Reset & Temporary Password (Synced with web)
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  temporaryPassword: { type: String },
  temporaryPasswordExpires: { type: Date },
  
  // GPS tracking fields for drivers (Mobile specific)
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Number },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    lastUpdate: { type: Date }
  },
  
  // Legacy compatibility fields (for existing data)
  name: { type: String }, // Legacy field
  phoneno: { type: String }, // Legacy field - maps to phoneNumber
  personalDetails: { type: String, default: '' }, // Legacy field - maps to bio
  
  // Audit fields (Synced with web)
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for faster queries (Synced with web)
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ assignedTo: 1 });
UserSchema.index({ isActive: 1 });

// Update the updatedBy field on save (Synced with web)
UserSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || 'System';
  }
  
  // Legacy field mapping for compatibility
  if (this.phoneno && !this.phoneNumber) {
    this.phoneNumber = this.phoneno;
  }
  if (this.personalDetails && !this.bio) {
    this.bio = this.personalDetails;
  }
  
  next();
});

const User = mongoose.model('User', UserSchema, 'users');

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
const Vehicle = mongoose.model('Vehicle', VehicleSchema, 'vehicles');

// Driver Allocation Schema (enhanced for dispatch functionality)
// SYNCED DriverAllocation Schema - Matches web version exactly
const DriverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,      // important: use unitId not conductionNumber
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  assignedDriverEmail: String, // For reliable driver matching
  assignedAgent: String,
  status: String,
  allocatedBy: String,

  // REAL LOCATION TRACKING - NO MORE MOCK DATA (From web version)
  currentLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    address: String,
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // REAL DELIVERY DESTINATION (e.g., Isuzu Pasig) (From web version)
  deliveryDestination: {
    latitude: { type: Number, min: -90, max: 90, default: 14.5791 }, // Isuzu Pasig
    longitude: { type: Number, min: -180, max: 180, default: 121.0655 }, // Isuzu Pasig
    address: { type: String, default: 'Isuzu Pasig Dealership, Metro Manila' },
    contactPerson: String,
    contactNumber: String
  },
  
  // REAL PICKUP LOCATION (From web version)
  pickupLocation: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    address: String,
    contactPerson: String,
    contactNumber: String
  },
  
  // GPS TRACKING HISTORY (From web version)
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now },
    speed: Number,
    heading: Number
  }],
  
  // ROUTE INFORMATION (From web version)
  pickupPoint: String, // Human-readable pickup location name
  dropoffPoint: String, // Human-readable dropoff location name
  pickupCoordinates: {
    latitude: Number,
    longitude: Number
  },
  dropoffCoordinates: {
    latitude: Number,
    longitude: Number
  },
  routeDistance: Number, // in kilometers
  estimatedTime: Number, // in minutes
  routeInfo: {
    distance: Number, // in meters
    estimatedDuration: Number, // in seconds
    actualDuration: Number, // in seconds
    routeStarted: Date,
    routeCompleted: Date
  },
  
  // CUSTOMER INFORMATION
  customerName: String,
  customerEmail: String,
  customerPhone: String,

  // Vehicle Process Management (From web version)
  requestedProcesses: [{
    type: String,
    enum: ['delivery_to_isuzu_pasig', 'tinting', 'carwash', 'ceramic_coating', 'accessories', 'rust_proof', 'stock_integration', 'documentation_check']
  }],

  processStatus: {
    delivery_to_isuzu_pasig: { type: Boolean, default: false },
    tinting: { type: Boolean, default: false },
    carwash: { type: Boolean, default: false },
    ceramic_coating: { type: Boolean, default: false },
    accessories: { type: Boolean, default: false },
    rust_proof: { type: Boolean, default: false }
  },

  processCompletedBy: {
    delivery_to_isuzu_pasig: String,
    tinting: String,
    carwash: String,
    ceramic_coating: String,
    accessories: String,
    rust_proof: String
  },

  processCompletedAt: {
    delivery_to_isuzu_pasig: Date,
    tinting: Date,
    carwash: Date,
    ceramic_coating: Date,
    accessories: Date,
    rust_proof: Date
  },

  // Overall status (From web version)
  overallProgress: {
    completed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    isComplete: { type: Boolean, default: false }
  },

  readyForRelease: { type: Boolean, default: false },
  releasedAt: Date,
  releasedBy: String
}, { timestamps: true });

const DriverAllocation = mongoose.model('DriverAllocation', DriverAllocationSchema, 'driverallocations');

// ======================== AUTH =========================

// Enhanced Login with Email-based Authentication
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body; // Keep 'username' for backward compatibility but treat as email
    const email = username; // The mobile app sends email in 'username' field
    console.log('📥 Login attempt:', email);
    console.log('🔍 Looking for user with email:', email.toLowerCase().trim());

    // Check admin credentials first
    if (email === 'isuzupasigadmin' && password === 'Isuzu_Pasig1') {
      req.session.user = {
        email: 'admin@isuzupasig.com',
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

    // Find user in database by email only
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });
    
    if (!user) {
      console.log('❌ User not found for:', email.toLowerCase().trim());
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('✅ User found:', user.email);

    let isValidLogin = false;
    let isTemporaryPassword = false;

    // Check if using temporary password
    if (user.temporaryPassword && 
        user.temporaryPasswordExpires && 
        user.temporaryPasswordExpires > Date.now()) {
      
      if (password === user.temporaryPassword) {
        isValidLogin = true;
        isTemporaryPassword = true;
        
        console.log('🔑 User logged in with temporary password:', email);
        
        // Clear temporary password after successful use
        user.temporaryPassword = undefined;
        user.temporaryPasswordExpires = undefined;
        await user.save();
      }
    }

    // If not using temporary password, check regular password (plain text)
    if (!isValidLogin) {
      console.log('🔍 Comparing plain text password for user:', user.email);
      if (password === user.password) {
        isValidLogin = true;
        console.log('🔑 User logged in with plain text password:', email);
      } else {
        console.log('❌ Password mismatch for user:', user.username);
      }
    }

    if (!isValidLogin) {
      console.log('❌ Login failed for user:', user.username);
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create session based on email
    const sessionUser = {
      id: user._id,
      email: user.email,
      role: user.role,
      accountName: user.accountName,
      name: user.name || user.accountName,
      assignedTo: user.assignedTo
    };

    req.session.user = sessionUser;

    const response = {
      success: true,
      user: {
        role: user.role,
        accountName: user.accountName,
        name: user.name || user.accountName,
        email: user.email
      }
    };

    // If temporary password was used, notify frontend to prompt password change
    if (isTemporaryPassword) {
      response.requirePasswordChange = true;
      response.message = 'Login successful with temporary password. Please change your password immediately.';
      console.log('⚠️  User should change password immediately:', email);
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// API Login route (for web compatibility)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Web version sends 'email' field
    console.log('📥 API Login attempt:', email);

    // Check admin credentials first
    if (email === 'isuzupasigadmin' && password === 'Isuzu_Pasig1') {
      req.session.user = {
        username: 'isuzupasigadmin',
        role: 'Admin',
        accountName: 'Isuzu Pasig Admin'
      };
      return res.json({ 
        success: true, 
        user: {
          id: 'admin',
          role: 'Admin', 
          name: 'Isuzu Pasig Admin',
          email: 'admin@isuzupasig.com'
        }
      });
    }

    // Find user in database by email only
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
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
        
        console.log('🔑 User logged in with temporary password:', email);
        
        // Clear temporary password after successful use
        user.temporaryPassword = undefined;
        user.temporaryPasswordExpires = undefined;
        await user.save();
      }
    }

    // Check regular password if temp password didn't work (plain text)
    if (!isValidLogin && user.password) {
      if (password === user.password) {
        isValidLogin = true;
        console.log('✅ User logged in with plain text password:', email);
      }
    }

    if (!isValidLogin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Set session based on email
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role || 'User',
      accountName: user.name || user.accountName
    };

    const response = {
      success: true,
      user: {
        id: user._id,
        name: user.name || user.accountName,
        email: user.email,
        role: user.role || 'User'
      }
    };

    // If temporary password was used, notify frontend to prompt password change
    if (isTemporaryPassword) {
      response.requirePasswordChange = true;
      response.message = 'Login successful with temporary password. Please change your password immediately.';
      console.log('⚠️  User should change password immediately:', email);
    }

    res.json(response);
  } catch (err) {
    console.error('❌ API Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ==================== PASSWORD MANAGEMENT ROUTES ====================

// Forgot Password - Send temporary password via email
app.post('/forgot-password', async (req, res) => {
  try {
    const { username } = req.body; // This will actually be an email now
    console.log('🔑 Forgot password request for email:', username);

    if (!username) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Find user by email only
    const user = await User.findOne({ email: username.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'If the email exists, a temporary password has been sent.' 
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

// API Forgot Password route (for web compatibility)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body; // Web version sends 'email' field
    console.log('🔑 API Forgot password request for email:', email);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Find user by email only
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        success: true, 
        message: 'If this email is registered, a reset link has been sent.' 
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
        message: 'If this email is registered, a reset link has been sent.' 
      });
    } else {
      console.error('❌ Failed to send email:', emailResult.message);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process request. Please try again.' 
      });
    }

  } catch (error) {
    console.error('❌ API Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request. Please try again.' });
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

// API Get Users route (for web compatibility)
app.get('/api/getUsers', async (req, res) => {
  try {
    const users = await User.find({}).select('-password -temporaryPassword');
    console.log(`📊 API Found ${users.length} users`);
    res.json(users); // Web version expects direct array, not wrapped in success object
  } catch (error) {
    console.error('❌ API Get users error:', error);
    res.status(500).json({ error: error.message });
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

// ========== PROFILE MANAGEMENT ENDPOINTS ==========

// Get individual user profile
app.get('/api/getUser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📱 Getting user profile for ID:', id);
    
    const user = await User.findById(id).select('-password -temporaryPassword');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Get user profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile
app.put('/updateProfile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, phoneno, personalDetails, picture } = req.body;
    
    console.log('📱 Updating profile for user ID:', id);
    console.log('📱 Request body:', { name, phoneNumber, phoneno, picture: picture ? 'base64 data' : undefined });
    
    const updateData = {
      updatedAt: new Date()
    };
    
    // Only update provided fields
    if (name !== undefined) updateData.name = name;
    // Accept both phoneNumber and phoneno for compatibility
    if (phoneNumber !== undefined) updateData.phoneno = phoneNumber;
    if (phoneno !== undefined) updateData.phoneno = phoneno;
    if (personalDetails !== undefined) updateData.personalDetails = personalDetails;
    if (picture !== undefined) updateData.picture = picture;
    
    const updatedUser = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -temporaryPassword');
    
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('✅ Profile updated successfully for:', updatedUser.username);
    res.json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced change password with userId support
app.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId && !req.session?.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const targetUserId = userId || req.session.user.id;
    console.log('🔐 Change password request for user ID:', targetUserId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(targetUserId);
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

// ========== INVENTORY/STOCK MANAGEMENT ENDPOINTS ==========

// Inventory Schema
const InventorySchema = new mongoose.Schema({
  unitName: { type: String, required: true },
  unitId: String, // Conduction Number - unique identifier
  bodyColor: String,
  variation: { type: String, required: true },
  conductionNumber: { type: String, required: true },
  engineNumber: String,
  keyNumber: String,
  plateNumber: String,
  chassisNumber: String,
  notes: String,
  quantity: { type: Number, default: 1 },
  status: { type: String, default: 'Available' },
  addedBy: String,
  lastUpdatedBy: String,
  addedDate: Date,
  dateUpdated: Date
}, { timestamps: true });
const Inventory = mongoose.model('Inventory', InventorySchema, 'inventories');

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
    const { unitName, unitId, bodyColor, variation, conductionNumber, quantity, addedBy } = req.body;
    
    const newStock = new Inventory({
      unitName,
      unitId: unitId || unitName,
      bodyColor,
      variation,
      conductionNumber: conductionNumber || unitId,
      quantity: quantity || 1
    });
    
    await newStock.save();
    
    // Log audit trail for inventory creation
    await logAuditTrail(
      'create',
      'Inventory',
      newStock._id,
      addedBy || 'System',
      {
        after: {
          unitName: newStock.unitName,
          unitId: newStock.unitId,
          variation: newStock.variation,
          bodyColor: newStock.bodyColor,
          status: newStock.status
        }
      }
    );
    
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
    
    // Get before state for audit logging
    const beforeState = await Inventory.findById(id);
    
    const updatedStock = await Inventory.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedStock) {
      return res.status(404).json({ success: false, message: 'Stock item not found' });
    }
    
    // Log audit trail for inventory update
    if (beforeState) {
      await logAuditTrail(
        'update',
        'Inventory',
        updatedStock._id,
        updateData.updatedBy || updateData.lastUpdatedBy || 'System',
        {
          before: {
            unitName: beforeState.unitName,
            status: beforeState.status,
            assignedAgent: beforeState.assignedAgent,
            bodyColor: beforeState.bodyColor
          },
          after: {
            unitName: updatedStock.unitName,
            status: updatedStock.status,
            assignedAgent: updatedStock.assignedAgent,
            bodyColor: updatedStock.bodyColor
          }
        }
      );
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
    
    // Log audit trail for inventory deletion
    await logAuditTrail(
      'delete',
      'Inventory',
      deletedStock._id,
      'System',
      {
        before: {
          unitName: deletedStock.unitName,
          unitId: deletedStock.unitId,
          variation: deletedStock.variation,
          status: deletedStock.status
        }
      }
    );
    
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
    
    // Update vehicle status to "Pending" when allocated
    if (allocationData.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: allocationData.unitId },
        { 
          status: 'Pending',
          lastUpdatedBy: 'System - Allocation',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Updated vehicle ${allocationData.unitId} status to "Pending"`);
    }
    
    console.log('✅ Created allocation:', newAllocation.unitName);
    res.json({ success: true, message: 'Allocation created successfully', data: newAllocation });
  } catch (error) {
    console.error('❌ Create allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update allocation
app.put('/updateAllocation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`📋 Updating allocation ${id}:`, updateData);
    
    const updatedAllocation = await DriverAllocation.findByIdAndUpdate(
      id,
      { $set: updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!updatedAllocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }
    
    console.log('✅ Updated allocation:', updatedAllocation.unitName);
    res.json({ success: true, message: 'Allocation updated successfully', data: updatedAllocation });
  } catch (error) {
    console.error('❌ Update allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete allocation
app.delete('/deleteAllocation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Deleting allocation ${id}`);
    
    const deletedAllocation = await DriverAllocation.findByIdAndDelete(id);
    
    if (!deletedAllocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }
    
    // When allocation is deleted, return vehicle to "Available" status
    if (deletedAllocation.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: deletedAllocation.unitId },
        { 
          status: 'Available',
          lastUpdatedBy: 'System - Allocation Deleted',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Returned vehicle ${deletedAllocation.unitId} status to "Available"`);
    }
    
    console.log('✅ Deleted allocation:', deletedAllocation.unitName);
    res.json({ success: true, message: 'Allocation deleted successfully', data: deletedAllocation });
  } catch (error) {
    console.error('❌ Delete allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete allocation - mark as delivered and calculate actual duration
app.post('/completeAllocation', async (req, res) => {
  try {
    const { allocationId } = req.body;
    
    console.log(`📋 Completing allocation ${allocationId}`);
    
    const allocation = await DriverAllocation.findById(allocationId);
    
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }
    
    const now = new Date();
    const actualDuration = allocation.routeInfo?.routeStarted 
      ? Math.floor((now - new Date(allocation.routeInfo.routeStarted)) / 1000) 
      : null;
    
    // Update allocation status to Delivered and set completion time
    allocation.status = 'Delivered';
    if (!allocation.routeInfo) {
      allocation.routeInfo = {};
    }
    allocation.routeInfo.routeCompleted = now;
    allocation.routeInfo.actualDuration = actualDuration;
    
    await allocation.save();
    
    console.log(`✅ Completed allocation ${allocation.unitName} - Actual duration: ${actualDuration}s`);
    res.json({ 
      success: true, 
      message: 'Delivery completed successfully', 
      data: allocation 
    });
  } catch (error) {
    console.error('❌ Complete allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== UNIT ALLOCATION ENDPOINTS (Sales Agent Assignment) ==========

// Define UnitAllocation schema
const unitAllocationSchema = new mongoose.Schema({
  unitId: { type: String, required: true },
  unitName: { type: String, required: true },
  assignedAgent: { type: String, required: true },
  allocatedBy: String,
  status: { type: String, default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

const UnitAllocation = mongoose.model('UnitAllocation', unitAllocationSchema);

// Get all unit allocations
app.get('/api/getUnitAllocations', async (req, res) => {
  try {
    const allocations = await UnitAllocation.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${allocations.length} unit allocations`);
    res.json(allocations);
  } catch (error) {
    console.error('❌ Get unit allocations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new unit allocation
app.post('/api/createUnitAllocation', async (req, res) => {
  try {
    const allocationData = req.body;
    console.log('📋 Creating unit allocation:', allocationData);
    
    // Check if unit is already allocated
    const existingAllocation = await UnitAllocation.findOne({ unitId: allocationData.unitId });
    if (existingAllocation) {
      return res.status(400).json({ 
        success: false, 
        message: 'This unit is already allocated to a sales agent' 
      });
    }
    
    const newAllocation = new UnitAllocation(allocationData);
    await newAllocation.save();
    
    // Update inventory to mark unit as assigned to agent
    if (allocationData.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: allocationData.unitId },
        { 
          assignedAgent: allocationData.assignedAgent,
          lastUpdatedBy: allocationData.allocatedBy || 'System',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Updated vehicle ${allocationData.unitId} assignedAgent to "${allocationData.assignedAgent}"`);
    }
    
    console.log('✅ Created unit allocation:', newAllocation.unitName);
    res.json({ success: true, message: 'Unit allocated successfully', data: newAllocation });
  } catch (error) {
    console.error('❌ Create unit allocation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete unit allocation
app.delete('/api/deleteUnitAllocation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Deleting unit allocation ${id}`);
    
    const deletedAllocation = await UnitAllocation.findByIdAndDelete(id);
    
    if (!deletedAllocation) {
      return res.status(404).json({ success: false, message: 'Unit allocation not found' });
    }
    
    // When allocation is deleted, remove agent assignment from inventory
    if (deletedAllocation.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: deletedAllocation.unitId },
        { 
          assignedAgent: null,
          lastUpdatedBy: 'System - Allocation Deleted',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Removed agent assignment from vehicle ${deletedAllocation.unitId}`);
    }
    
    console.log('✅ Deleted unit allocation:', deletedAllocation.unitName);
    res.json({ success: true, message: 'Unit allocation deleted successfully', data: deletedAllocation });
  } catch (error) {
    console.error('❌ Delete unit allocation error:', error);
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
    
    // Update vehicle status to "Preparing" when assigned to dispatch
    if (assignmentData.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: assignmentData.unitId },
        { 
          status: 'Preparing',
          lastUpdatedBy: 'System - Dispatch Assignment',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Updated vehicle ${assignmentData.unitId} status to "Preparing"`);
    }
    
    // Log audit trail
    await logAuditTrail(
      'create',
      'DispatchAssignment',
      savedAssignment._id,
      assignmentData.assignedBy || 'System',
      {
        after: {
          unitName: assignmentData.unitName,
          unitId: assignmentData.unitId,
          assignedDriver: assignmentData.assignedDriver,
          processes: assignmentData.processes,
          status: 'Assigned to Dispatch'
        }
      }
    );
    
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
    const totalProcesses = (assignment.requestedProcesses || assignment.processes)?.length || 0;
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
    
    // Log audit trail for task completion
    await logAuditTrail(
      'update',
      'DispatchTask',
      assignment._id,
      completedBy || 'System',
      {
        before: { processStatus: { [processId]: !completed } },
        after: { 
          processStatus: { [processId]: completed },
          processName: processId,
          unitName: assignment.unitName,
          unitId: assignment.unitId,
          overallProgress: assignment.overallProgress,
          status: assignment.status
        }
      }
    );
    
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

// ========== DRIVER LOCATION TRACKING ENDPOINTS ==========

// Update driver location (real-time GPS tracking)
app.post('/updateDriverLocation', async (req, res) => {
  try {
    const { driverId, driverEmail, driverName, location } = req.body;
    console.log('📍 Updating driver location:', { driverName, location });

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Location coordinates are required' 
      });
    }

    // Find the driver by ID or email
    let driver = null;
    if (driverId) {
      driver = await User.findById(driverId);
    } else if (driverEmail) {
      driver = await User.findOne({ email: driverEmail });
    }

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    // Update driver's current location
    await User.updateOne(
      { _id: driver._id },
      { 
        $set: { 
          currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp || Date.now(),
            speed: location.speed || 0,
            heading: location.heading || 0,
            lastUpdate: new Date()
          }
        }
      }
    );

    // Update any active allocations for this driver
    await DriverAllocation.updateMany(
      { 
        $or: [
          { assignedDriver: driver.accountName },
          { assignedDriver: driver.username },
          { assignedDriver: driverName }
        ]
      },
      { 
        $set: { 
          'currentLocation.latitude': location.latitude,
          'currentLocation.longitude': location.longitude,
          'currentLocation.lastUpdated': new Date(),
          'currentLocation.speed': location.speed || 0,
          'currentLocation.heading': location.heading || 0
        },
        $push: {
          locationHistory: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date(),
            speed: location.speed || 0,
            heading: location.heading || 0
          }
        }
      }
    );

    console.log('✅ Driver location updated successfully');
    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      location: location 
    });

  } catch (error) {
    console.error('❌ Update driver location error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update location',
      error: error.message 
    });
  }
});

// Get driver's current location
app.get('/getDriverLocation/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    console.log('📍 Getting location for driver:', driverId);

    const driver = await User.findById(driverId).select('currentLocation name email');
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        driverName: driver.name,
        driverEmail: driver.email,
        location: driver.currentLocation || null
      }
    });

  } catch (error) {
    console.error('❌ Get driver location error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get location',
      error: error.message 
    });
  }
});

// Get all active drivers with their locations
app.get('/getAllDriverLocations', async (req, res) => {
  try {
    console.log('📍 Getting all driver locations...');

    const drivers = await User.find({ 
      role: 'Driver',
      isActive: true,
      currentLocation: { $exists: true }
    }).select('name email currentLocation');

    const driverLocations = drivers.map(driver => ({
      id: driver._id,
      name: driver.name,
      email: driver.email,
      location: driver.currentLocation
    }));

    console.log(`✅ Found ${driverLocations.length} drivers with location data`);
    res.json({ 
      success: true, 
      data: driverLocations
    });

  } catch (error) {
    console.error('❌ Get all driver locations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get driver locations',
      error: error.message 
    });
  }
});

// ========== GOOGLE MAPS API ENDPOINTS ==========

// Get route directions using Google Maps Directions API (for mobile)
app.post('/getRoute', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🗺️ Getting route from Google Maps API:', { origin, destination });

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decode polyline to coordinates array
      const polyline = decodePolyline(route.overview_polyline.points);
      
      res.json({
        success: true,
        route: {
          polyline: polyline,
          distance: leg.distance.text,
          duration: leg.duration.text,
          bounds: route.bounds,
          summary: route.summary
        }
      });
    } else {
      console.warn('⚠️ Google Maps API error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'No route found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Directions API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route directions',
      error: error.message
    });
  }
});

// Polyline decoder function
function decodePolyline(encoded) {
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  const points = [];

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    points.push({
      latitude: lat / 1E5,
      longitude: lng / 1E5
    });
  }
  return points;
}

// Get route directions using Google Maps Directions API
app.post('/api/directions/route', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🗺️ Getting route from Google Maps API:', { origin, destination });

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      res.json({
        success: true,
        route: {
          overview_polyline: route.overview_polyline.points,
          bounds: route.bounds,
          legs: route.legs,
          summary: route.summary,
          distance: route.legs[0].distance,
          duration: route.legs[0].duration
        }
      });
    } else {
      console.warn('⚠️ Google Maps API error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'No route found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Directions API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route directions',
      error: error.message
    });
  }
});

// Geocode address to coordinates
app.post('/api/geocode/address', async (req, res) => {
  try {
    const { address } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('📍 Geocoding address:', address);

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      
      res.json({
        success: true,
        location: result.geometry.location,
        formatted_address: result.formatted_address,
        place_id: result.place_id
      });
    } else {
      console.warn('⚠️ Geocoding error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'Address not found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
});

// Reverse geocode coordinates to address
app.post('/api/geocode/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('📍 Reverse geocoding:', { latitude, longitude });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      
      res.json({
        success: true,
        address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components
      });
    } else {
      console.warn('⚠️ Reverse geocoding error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'Location not found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse geocode',
      error: error.message
    });
  }
});

// Search places using Google Places API
app.post('/api/places/search', async (req, res) => {
  try {
    const { query, location } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🔍 Searching places:', query);

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (location) {
      url += `&location=${location.latitude},${location.longitude}&radius=5000`;
    }
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      res.json({
        success: true,
        places: data.results.map(place => ({
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: place.geometry.location,
          types: place.types,
          rating: place.rating
        }))
      });
    } else {
      console.warn('⚠️ Places search error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'No places found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Places search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search places',
      error: error.message
    });
  }
});

// Get Google Maps API Key
app.get('/api/maps/api-key', (req, res) => {
  try {
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    res.json({
      success: true,
      apiKey: GOOGLE_MAPS_API_KEY
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key'
    });
  }
});

// Google Maps Routes API - Get optimal route with traffic
app.post('/api/maps/route', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🗺️  Calculating route:', { origin, destination });

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    // Use Directions API (works with current setup)
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      res.json({
        success: true,
        route: {
          distance: leg.distance.text,
          duration: leg.duration.text,
          durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          startLocation: leg.start_location,
          endLocation: leg.end_location,
          polyline: route.overview_polyline.points,
          steps: leg.steps.map(step => ({
            distance: step.distance.text,
            duration: step.duration.text,
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
            startLocation: step.start_location,
            endLocation: step.end_location
          }))
        }
      });
    } else {
      console.warn('⚠️  Route calculation error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'No route found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Route calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate route',
      error: error.message
    });
  }
});

// Google Maps Distance Matrix API - Calculate distances for multiple origins/destinations
app.post('/api/maps/distance-matrix', async (req, res) => {
  try {
    const { origins, destinations } = req.body;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('📊 Calculating distance matrix');

    if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Origins and destinations arrays are required'
      });
    }

    const originsStr = origins.join('|');
    const destinationsStr = destinations.join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      res.json({
        success: true,
        matrix: {
          originAddresses: data.origin_addresses,
          destinationAddresses: data.destination_addresses,
          rows: data.rows.map(row => ({
            elements: row.elements.map(el => ({
              distance: el.distance?.text,
              duration: el.duration?.text,
              durationInTraffic: el.duration_in_traffic?.text,
              status: el.status
            }))
          }))
        }
      });
    } else {
      console.warn('⚠️  Distance matrix error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'Failed to calculate distances',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Distance matrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate distance matrix',
      error: error.message
    });
  }
});

// Google Places API - Get place details by place_id
app.get('/api/places/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🔍 Getting place details:', placeId);

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,formatted_phone_number,rating,reviews,photos,opening_hours,website&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      res.json({
        success: true,
        place: {
          name: data.result.name,
          address: data.result.formatted_address,
          location: data.result.geometry.location,
          phone: data.result.formatted_phone_number,
          rating: data.result.rating,
          reviews: data.result.reviews,
          photos: data.result.photos,
          openingHours: data.result.opening_hours,
          website: data.result.website
        }
      });
    } else {
      console.warn('⚠️  Place details error:', data.status, data.error_message);
      res.status(400).json({
        success: false,
        message: data.error_message || 'Place not found',
        status: data.status
      });
    }

  } catch (error) {
    console.error('❌ Place details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get place details',
      error: error.message
    });
  }
});

// Google Places API - Autocomplete for place searches
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const { input, location, radius } = req.query;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    console.log('🔍 Place autocomplete:', input);

    if (!input) {
      return res.status(400).json({
        success: false,
        message: 'Input parameter is required'
      });
    }

    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (location && radius) {
      url += `&location=${location}&radius=${radius}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.predictions) {
      res.json({
        success: true,
        predictions: data.predictions.map(pred => ({
          placeId: pred.place_id,
          description: pred.description,
          mainText: pred.structured_formatting.main_text,
          secondaryText: pred.structured_formatting.secondary_text
        }))
      });
    } else {
      res.json({
        success: true,
        predictions: []
      });
    }

  } catch (error) {
    console.error('❌ Place autocomplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to autocomplete places',
      error: error.message
    });
  }
});

// API versions for web compatibility
app.post('/api/updateDriverLocation', async (req, res) => {
  // Redirect to main endpoint
  req.url = '/updateDriverLocation';
  return app._router.handle(req, res);
});

app.get('/api/getAllDriverLocations', async (req, res) => {
  // Redirect to main endpoint  
  req.url = '/getAllDriverLocations';
  return app._router.handle(req, res);
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
    
    // Log audit trail for driver allocation
    await logAuditTrail(
      'create',
      'DriverAllocation',
      newAllocation._id,
      req.body.allocatedBy || 'System',
      {
        after: {
          unitName: req.body.unitName,
          unitId: req.body.unitId,
          assignedDriver: req.body.assignedDriver,
          status: req.body.status || 'Pending'
        }
      }
    );
    
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
    
    // Get before state for audit logging
    const beforeState = await DriverAllocation.findById(req.params.id);
    
    const updated = await DriverAllocation.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Allocation not found' });
    
    // Update vehicle status based on allocation status changes
    if (req.body.status && updated.unitId) {
      let newVehicleStatus = null;
      
      if (req.body.status === 'In Transit') {
        newVehicleStatus = 'In Transit';
      } else if (req.body.status === 'Delivered' || req.body.status === 'Completed') {
        // When driver delivers to Isuzu Pasig, set to Available
        newVehicleStatus = 'Available';
      }
      
      if (newVehicleStatus) {
        await Inventory.findOneAndUpdate(
          { unitId: updated.unitId },
          { 
            status: newVehicleStatus,
            lastUpdatedBy: `System - ${req.body.status}`,
            dateUpdated: new Date()
          }
        );
        console.log(`✅ Updated vehicle ${updated.unitId} status to "${newVehicleStatus}"`);
      }
    }
    
    // Log audit trail for allocation update (delivery)
    if (beforeState) {
      await logAuditTrail(
        'update',
        'DriverAllocation',
        updated._id,
        req.body.updatedBy || 'System',
        {
          before: {
            status: beforeState.status,
            unitName: beforeState.unitName,
            unitId: beforeState.unitId
          },
          after: {
            status: updated.status,
            unitName: updated.unitName,
            unitId: updated.unitId,
            assignedDriver: updated.assignedDriver
          }
        }
      );
    }
    
    res.json({ success: true, allocation: updated });
  } catch (err) {
    console.error('Error updating driver allocation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== SERVICE REQUEST ENDPOINTS ==========

// Service Request Schema
const ServiceRequestSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  service: [String], // Array of requested services
  serviceTime: Date,
  status: { type: String, default: 'Pending' },
  preparedBy: String,
  dateCreated: { type: Date, default: Date.now },
  completedAt: Date,
  completedBy: String,
  dispatchedFrom: String, // Track where request came from
  completedServices: [String], // Track which services are done
  pendingServices: [String] // Track which services are not done yet
}, { timestamps: true });
const Servicerequest = mongoose.model('Servicerequest', ServiceRequestSchema, 'servicerequests');

// Get service requests
app.get('/getRequest', async (req, res) => {
  try {
    console.log('📥 GET /getRequest called');
    const requests = await Servicerequest.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${requests.length} service requests`);
    if (requests.length > 0) {
      console.log('📋 Latest request:', {
        id: requests[0]._id,
        unitName: requests[0].unitName,
        status: requests[0].status,
        createdAt: requests[0].createdAt
      });
    }
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

// ========== AUDIT TRAILS ==========

// Audit Trail Schema  
const AuditTrailSchema = new mongoose.Schema({
  action: String,
  resource: String,
  resourceId: String,
  performedBy: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const AuditTrail = mongoose.model('AuditTrail', AuditTrailSchema, 'audittrails');

// Helper function to log audit trail
const logAuditTrail = async (action, resource, resourceId, performedBy, details = {}) => {
  try {
    const auditEntry = new AuditTrail({
      action,
      resource,
      resourceId,
      performedBy,
      details,
      timestamp: new Date()
    });
    await auditEntry.save();
    console.log(`📝 Audit logged: ${action} on ${resource} by ${performedBy}`);
  } catch (error) {
    console.error('❌ Error logging audit trail:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
};

// Web-compatible audit trail endpoint (matches web version format)
app.get('/api/audit-trail', async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, resource, performedBy } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (performedBy) query.performedBy = performedBy;
    
    const audittrails = await AuditTrail.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    console.log(`📊 [Web Format] Found ${audittrails.length} audit trails`);
    
    // Return in web format (direct array, not wrapped in success object)
    res.json(audittrails);
  } catch (error) {
    console.error('❌ Error fetching audit trails (web format):', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit trails
app.get('/api/audittrails', async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, resource, performedBy } = req.query;
    
    let query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (performedBy) query.performedBy = performedBy;
    
    const audittrails = await AuditTrail.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await AuditTrail.countDocuments(query);
    
    console.log(`📊 Found ${audittrails.length} audit trails (${total} total)`);
    res.json({ 
      success: true, 
      data: audittrails,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + audittrails.length) < total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching audit trails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit trails',
      error: error.message
    });
  }
});

// Get audit trails for specific resource
app.get('/api/audittrails/:resourceId', async (req, res) => {
  try {
    const { resourceId } = req.params;
    const audittrails = await AuditTrail.find({ resourceId })
      .sort({ timestamp: -1 });
    
    console.log(`📊 Found ${audittrails.length} audit trails for resource ${resourceId}`);
    res.json({ success: true, data: audittrails });
  } catch (error) {
    console.error('❌ Error fetching resource audit trails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource audit trails',
      error: error.message
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
    
    // Update vehicle status in Inventory to "Released"
    if (updatedAllocation.unitId) {
      await Inventory.findOneAndUpdate(
        { unitId: updatedAllocation.unitId },
        { 
          status: 'Released',
          lastUpdatedBy: releaseData.releasedBy || 'System - Release',
          dateUpdated: new Date()
        }
      );
      console.log(`✅ Updated vehicle ${updatedAllocation.unitId} status to "Released"`);
    }
    
    // Log audit trail for release
    await logAuditTrail(
      'create',
      'VehicleRelease',
      updatedAllocation._id,
      releaseData.releasedBy || 'System',
      {
        after: {
          unitName: updatedAllocation.unitName,
          unitId: updatedAllocation.unitId,
          assignedDriver: updatedAllocation.assignedDriver,
          releasedAt: releaseData.releasedAt,
          status: 'Released'
        }
      }
    );
    
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

// ========== TEST DRIVE VEHICLES ==========

// Create TestDriveVehicle model
const testDriveVehicleSchema = new mongoose.Schema({
  unitName: { type: String, required: true },
  unitId: { type: String, required: true },
  bodyColor: { type: String, required: true },
  variation: { type: String, required: true },
  status: { type: String, enum: ['Available', 'In Use', 'Maintenance', 'Unavailable'], default: 'Available' },
  mileage: { type: Number, default: 0 },
  fuelLevel: { type: String, default: 'Full' },
  location: { type: String, default: 'Isuzu Stockyard' },
  addedBy: { type: String, required: true },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TestDriveVehicle = mongoose.model('TestDriveVehicle', testDriveVehicleSchema);

// Get all test drive vehicles
app.get('/api/testdrive-vehicles', async (req, res) => {
  try {
    console.log('📋 Fetching test drive vehicles...');
    
    const vehicles = await TestDriveVehicle.find({}).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${vehicles.length} test drive vehicles`);
    res.json({
      success: true,
      data: vehicles,
      count: vehicles.length
    });
  } catch (error) {
    console.error('❌ Error fetching test drive vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test drive vehicles',
      details: error.message
    });
  }
});

// Add new test drive vehicle
app.post('/api/testdrive-vehicles', async (req, res) => {
  try {
    const vehicleData = req.body;
    console.log('📋 Adding test drive vehicle:', vehicleData);
    
    // Check if unitId already exists
    const existingVehicle = await TestDriveVehicle.findOne({ unitId: vehicleData.unitId });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        error: 'Unit ID already exists'
      });
    }
    
    const newVehicle = new TestDriveVehicle({
      ...vehicleData,
      updatedAt: new Date()
    });
    
    await newVehicle.save();
    
    console.log('✅ Test drive vehicle added:', newVehicle.unitName);
    res.json({
      success: true,
      data: newVehicle,
      message: 'Test drive vehicle added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding test drive vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add test drive vehicle',
      details: error.message
    });
  }
});

// Update test drive vehicle
app.put('/api/testdrive-vehicles/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const updates = req.body;
    console.log('📋 Updating test drive vehicle:', vehicleId);
    
    const updatedVehicle = await TestDriveVehicle.findByIdAndUpdate(
      vehicleId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        error: 'Test drive vehicle not found'
      });
    }
    
    console.log('✅ Test drive vehicle updated:', updatedVehicle.unitName);
    res.json({
      success: true,
      data: updatedVehicle,
      message: 'Test drive vehicle updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating test drive vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test drive vehicle',
      details: error.message
    });
  }
});

// Delete test drive vehicle
app.delete('/api/testdrive-vehicles/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;
    console.log('📋 Deleting test drive vehicle:', vehicleId);
    
    const deletedVehicle = await TestDriveVehicle.findByIdAndDelete(vehicleId);
    
    if (!deletedVehicle) {
      return res.status(404).json({
        success: false,
        error: 'Test drive vehicle not found'
      });
    }
    
    console.log('✅ Test drive vehicle deleted:', deletedVehicle.unitName);
    res.json({
      success: true,
      message: 'Test drive vehicle deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting test drive vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test drive vehicle',
      details: error.message
    });
  }
});

// ========== AUDIT TRAIL & HISTORY ==========

// Get system audit trail
app.get('/api/audit-trail', async (req, res) => {
  try {
    console.log('📊 Fetching audit trail...');
    
    // Get recent activities from various collections
    const activities = [];
    
    // Recent allocations
    const recentAllocations = await DriverAllocation.find({})
      .sort({ createdAt: -1 })
      .limit(10);
    
    recentAllocations.forEach(allocation => {
      activities.push({
        _id: allocation._id,
        type: 'allocation',
        action: 'Vehicle Assigned',
        description: `${allocation.unitName} assigned to ${allocation.assignedDriver}`,
        user: allocation.allocatedBy || 'System',
        timestamp: allocation.createdAt,
        details: {
          unitName: allocation.unitName,
          unitId: allocation.unitId,
          driver: allocation.assignedDriver,
          status: allocation.status
        }
      });
    });
    
    // Recent user creations (if createdAt field exists)
    try {
      const recentUsers = await User.find({ createdAt: { $exists: true } })
        .sort({ createdAt: -1 })
        .limit(5);
      
      recentUsers.forEach(user => {
        activities.push({
          _id: user._id,
          type: 'user',
          action: 'User Created',
          description: `New ${user.role} account created: ${user.accountName}`,
          user: 'Admin',
          timestamp: user.createdAt,
          details: {
            role: user.role,
            email: user.email,
            accountName: user.accountName
          }
        });
      });
    } catch (userError) {
      console.log('Note: User createdAt field not available');
    }
    
    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`✅ Found ${activities.length} audit trail entries`);
    res.json({
      success: true,
      data: activities.slice(0, 20), // Return top 20 most recent
      count: activities.length
    });
  } catch (error) {
    console.error('❌ Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit trail',
      details: error.message
    });
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
        
        // Profile Management
        getUser: '/api/getUser/:id',
        updateProfile: '/updateProfile/:id',
        
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
      total: 27,
      categories: [
        'Authentication (5)',
        'User Management (4)',
        'Profile Management (2)', 
        'Inventory Management (5)',
        'Dispatch Management (5)',
        'Vehicle Management (4)',
        'Dashboard & Reports (2)'
      ]
    }
  });
});

// Email Notification System
// POST /api/send-notification - Send email notification to customer
app.post('/api/send-notification', async (req, res) => {
  try {
    const { customerEmail, customerName, vehicleModel, vin, status, processDetails } = req.body;
    
    console.log('📧 Sending notification:', { customerEmail, customerName, vehicleModel, status });
    
    if (!customerEmail || !customerName || !vehicleModel || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerEmail, customerName, vehicleModel, status'
      });
    }

    // Define notification templates based on the official Isuzu Pasig templates
    const getNotificationTemplate = (status, processDetails = '') => {
      switch (status.toLowerCase()) {
        case 'vehicle preparation':
        case 'in preparation':
        case 'tinting':
        case 'car wash':
        case 'rust proof':
        case 'accessories':
        case 'ceramic coating':
          return {
            subject: `Vehicle Preparation Update - ${vehicleModel}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ff1e1e; text-align: center;">Isuzu Pasig - Vehicle Update</h2>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Dear ${customerName},</strong></p>
                  <p>Hi ${customerName}, this is Isuzu Pasig. Your vehicle <strong>${vehicleModel}</strong> is now undergoing: <strong>${processDetails || status}</strong>.</p>
                  <p>Thank you for choosing Isuzu Pasig.</p>
                </div>
                <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
                  <p style="margin: 0;"><strong>Vehicle Details:</strong></p>
                  <p style="margin: 5px 0;">Model: ${vehicleModel}</p>
                  ${vin ? `<p style="margin: 5px 0;">VIN: ${vin}</p>` : ''}
                  <p style="margin: 5px 0;">Status: ${status}</p>
                </div>
                <p style="text-align: center; margin-top: 30px; color: #666;">
                  <em>Thank you for choosing Isuzu Pasig</em><br>
                  I-Track Vehicle Management System
                </p>
              </div>
            `
          };
          
        case 'dispatch & arrival':
        case 'in transit':
        case 'arriving':
          return {
            subject: `Vehicle Dispatch Update - ${vehicleModel}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ff1e1e; text-align: center;">Isuzu Pasig - Dispatch Alert</h2>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Dear ${customerName},</strong></p>
                  <p>The vehicle <strong>${vehicleModel}</strong>, driven by [Driver] is arriving shortly at Isuzu Pasig.</p>
                </div>
                <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
                  <p style="margin: 0;"><strong>Vehicle Details:</strong></p>
                  <p style="margin: 5px 0;">Model: ${vehicleModel}</p>
                  ${vin ? `<p style="margin: 5px 0;">VIN: ${vin}</p>` : ''}
                  <p style="margin: 5px 0;">Status: ${status}</p>
                </div>
                <p style="text-align: center; margin-top: 30px; color: #666;">
                  <em>Thank you for choosing Isuzu Pasig</em><br>
                  I-Track Vehicle Management System
                </p>
              </div>
            `
          };
          
        case 'ready for release':
        case 'done':
        case 'completed':
        case 'ready':
          return {
            subject: `Vehicle Ready for Release - ${vehicleModel}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ff1e1e; text-align: center;">Isuzu Pasig - Vehicle Release</h2>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Dear ${customerName},</strong></p>
                  <p>Good news! Your vehicle is now ready for release. Please proceed to Isuzu Pasig or contact your sales agent for pickup details.</p>
                  <p>Thank you for choosing Isuzu Pasig.</p>
                </div>
                <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
                  <p style="margin: 0;"><strong>Vehicle Details:</strong></p>
                  <p style="margin: 5px 0;">Model: ${vehicleModel}</p>
                  ${vin ? `<p style="margin: 5px 0;">VIN: ${vin}</p>` : ''}
                  <p style="margin: 5px 0;">Status: Ready for Release</p>
                </div>
                <p style="text-align: center; margin-top: 30px; color: #666;">
                  <em>Thank you for choosing Isuzu Pasig</em><br>
                  I-Track Vehicle Management System
                </p>
              </div>
            `
          };
          
        default:
          return {
            subject: `Vehicle Status Update - ${vehicleModel}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ff1e1e; text-align: center;">Isuzu Pasig - Status Update</h2>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Dear ${customerName},</strong></p>
                  <p>Your vehicle <strong>${vehicleModel}</strong> status has been updated to: <strong>${status}</strong></p>
                  <p>Thank you for choosing Isuzu Pasig.</p>
                </div>
                <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
                  <p style="margin: 0;"><strong>Vehicle Details:</strong></p>
                  <p style="margin: 5px 0;">Model: ${vehicleModel}</p>
                  ${vin ? `<p style="margin: 5px 0;">VIN: ${vin}</p>` : ''}
                  <p style="margin: 5px 0;">Status: ${status}</p>
                </div>
                <p style="text-align: center; margin-top: 30px; color: #666;">
                  <em>Thank you for choosing Isuzu Pasig</em><br>
                  I-Track Vehicle Management System
                </p>
              </div>
            `
          };
      }
    };

    const template = getNotificationTemplate(status, processDetails);
    
    // Configure email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'itrack@isuzupasig.com',
      to: customerEmail,
      subject: template.subject,
      html: template.html
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Email notification sent successfully to:', customerEmail);
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      emailSent: true,
      smsSent: false // Will be true when iTexMo integration is ready
    });
    
  } catch (error) {
    console.error('❌ Email notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// GET /api/servicerequests - Get service requests for dispatch
app.get('/api/servicerequests', async (req, res) => {
  try {
    console.log('📋 Fetching service requests...');
    
    // For now, return allocations from DriverAllocation collection
    // In the future, this can be moved to a dedicated ServiceRequest collection
    const serviceRequests = await DriverAllocation.find({});
    
    console.log(`📊 Found ${serviceRequests.length} service requests`);
    
    res.json({
      success: true,
      data: serviceRequests,
      message: `Found ${serviceRequests.length} service requests`
    });
    
  } catch (error) {
    console.error('❌ Error fetching service requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service requests',
      error: error.message
    });
  }
});

// PUT /api/servicerequests/:id - Update service request status
app.put('/api/servicerequests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔄 Updating service request ${id}:`, updateData);
    
    const updatedRequest = await DriverAllocation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    console.log('✅ Service request updated successfully');
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Service request updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service request',
      error: error.message
    });
  }
});

// PUT /api/servicerequests/:id/process - Update process status
app.put('/api/servicerequests/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { processId, completed, completedBy, completedAt } = req.body;
    
    console.log(`🔄 Updating process ${processId} for service request ${id}`);
    
    const serviceRequest = await DriverAllocation.findById(id);
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }
    
    // Update the process status (this would be enhanced with actual process tracking)
    const updateData = {
      status: completed ? 'Process Completed' : 'In Progress',
      lastUpdatedBy: completedBy,
      lastUpdatedAt: completedAt || new Date().toISOString()
    };
    
    const updatedRequest = await DriverAllocation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    console.log('✅ Process status updated successfully');
    
    res.json({
      success: true,
      data: updatedRequest,
      message: 'Process status updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating process:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update process',
      error: error.message
    });
  }
});

// Server listening configuration - Updated for Render deployment
const PORT = process.env.PORT || 5000; // Use Render's PORT or fallback to 5000
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('🚀====================================🚀');
  console.log('    I-TRACK MOBILE BACKEND SERVER    ');
  console.log('🚀====================================🚀');
  console.log('');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Active Backend: ${ACTIVE_BACKEND.NAME}`);
  console.log(`🔗 Server running on:`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`   - Production: ${ACTIVE_BACKEND.BASE_URL}`);
    console.log(`   - Port: ${PORT}`);
  } else {
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Network: http://0.0.0.0:${PORT}`);
    console.log(`   - Loopback: http://127.0.0.1:${PORT}`);
  }
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
  console.log('  👤 PROFILE MANAGEMENT:');
  console.log('    - GET    /api/getUser/:id');
  console.log('    - PUT    /updateProfile/:id');
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

// =================== ADDITIONAL API ENDPOINTS FOR UNIFIED MOBILE APP ===================

// Inventory Management Endpoints


// Service Request Endpoints
app.get('/getServiceRequests', async (req, res) => {
  try {
    const serviceRequests = await DriverAllocation.find({
      requestedProcesses: { $exists: true, $ne: [] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: serviceRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/createServiceRequest', async (req, res) => {
  try {
    console.log('📥 Received createServiceRequest request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const newRequest = new Servicerequest({
      ...req.body,
      status: req.body.status || 'Pending',
      dateCreated: new Date(),
      completedAt: null,
      completedBy: null
    });
    
    console.log('💾 Attempting to save service request...');
    const savedRequest = await newRequest.save();
    console.log('✅ Service request saved successfully!');
    console.log('📄 Saved document:', {
      id: savedRequest._id,
      unitName: savedRequest.unitName,
      unitId: savedRequest.unitId,
      status: savedRequest.status,
      services: savedRequest.service,
      createdAt: savedRequest.createdAt
    });
    
    // Verify it was saved by reading it back
    const verification = await Servicerequest.findById(savedRequest._id);
    if (verification) {
      console.log('✅ Verified: Document exists in database');
    } else {
      console.error('❌ WARNING: Document not found after save!');
    }
    
    res.json({ success: true, data: savedRequest });
  } catch (error) {
    console.error('❌ Error creating service request:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/updateServiceRequest/:id', async (req, res) => {
  try {
    const updated = await Servicerequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test Drive Endpoints
const TestDriveSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  customerEmail: String,
  unitId: String,
  unitName: String,
  scheduledDate: Date,
  scheduledTime: String,
  status: { type: String, default: 'Scheduled' },
  notes: String,
  createdBy: String
}, { timestamps: true });

const TestDrive = mongoose.model('TestDrive', TestDriveSchema, 'testdrives');

app.get('/getTestDrives', async (req, res) => {
  try {
    const testDrives = await TestDrive.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: testDrives });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/createTestDrive', async (req, res) => {
  try {
    const newTestDrive = new TestDrive(req.body);
    await newTestDrive.save();
    res.json({ success: true, data: newTestDrive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/updateTestDrive/:id', async (req, res) => {
  try {
    const updated = await TestDrive.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enhanced User Management Endpoints
app.put('/updateUser/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, {
      ...req.body,
      updatedAt: new Date()
    }, { new: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/sendPasswordReset', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const tempExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await User.findByIdAndUpdate(userId, {
      temporaryPassword: tempPassword,
      temporaryPasswordExpires: tempExpires
    });
    
    // In production, send actual email here
    console.log(`📧 Temporary password for ${email}: ${tempPassword}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset sent',
      tempPassword // Remove in production
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reports and Analytics Endpoints
app.get('/getRecentActivities', async (req, res) => {
  try {
    // Mock recent activities - in production, implement proper activity logging
    const activities = [
      {
        type: 'allocation',
        description: 'New vehicle allocation created',
        timestamp: new Date()
      },
      {
        type: 'delivery',
        description: 'Vehicle delivered to customer',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        type: 'user',
        description: 'New user registered',
        timestamp: new Date(Date.now() - 1000 * 60 * 60)
      }
    ];
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/generateReport', async (req, res) => {
  try {
    const { reportType, period, generatedBy } = req.body;
    
    // Mock report generation - implement actual report generation logic
    console.log(`📊 Generating ${reportType} report for ${period} by ${generatedBy}`);
    
    res.json({ 
      success: true, 
      message: `${reportType} report generated successfully`,
      reportId: `RPT_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============= VEHICLE MODELS API ENDPOINTS =============

// Get all vehicle models (unit names and variations)
app.get('/getVehicleModels', async (req, res) => {
  try {
    // Try to fetch from external service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('http://localhost:8000/api/vehicle-models', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }
    
    const models = await response.json();
    res.json(models);
  } catch (error) {
    // Silently fail - client will use local data
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ Vehicle models API unavailable, client will use local data');
    }
    res.status(500).json({ 
      success: false, 
      message: 'Vehicle models service unavailable' 
    });
  }
});

// Get unit names only
app.get('/getUnitNames', async (req, res) => {
  try {
    const unitNames = await fetch('http://localhost:8000/api/vehicle-models/units').then(r => r.json());
    res.json(unitNames);
  } catch (error) {
    console.error('❌ Error fetching unit names:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unit names' });
  }
});

// Get variations for specific unit
app.get('/getVariations/:unitName', async (req, res) => {
  try {
    const { unitName } = req.params;
    const variations = await fetch(`http://localhost:8000/api/vehicle-models/${encodeURIComponent(unitName)}/variations`).then(r => r.json());
    res.json(variations);
  } catch (error) {
    console.error('❌ Error fetching variations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch variations' });
  }
});

// Validate unit-variation pair
app.post('/validateUnitVariation', async (req, res) => {
  try {
    const validation = await fetch('http://localhost:8000/api/vehicle-models/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    }).then(r => r.json());
    res.json(validation);
  } catch (error) {
    console.error('❌ Error validating unit-variation pair:', error);
    res.status(500).json({ success: false, message: 'Failed to validate unit-variation pair' });
  }
});

// ============= INVENTORY API ENDPOINTS =============

// Get inventory with enhanced filtering
app.get('/getInventory', async (req, res) => {
  try {
    const { status, unitName, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = new RegExp(status, 'i');
    }
    
    if (unitName) {
      query.unitName = new RegExp(unitName, 'i');
    }
    
    if (search) {
      query.$or = [
        { unitName: new RegExp(search, 'i') },
        { unitId: new RegExp(search, 'i') },
        { bodyColor: new RegExp(search, 'i') },
        { variation: new RegExp(search, 'i') },
        { conductionNumber: new RegExp(search, 'i') }
      ];
    }

    const inventory = await Inventory.find(query)
      .sort({ createdAt: -1 })
      .limit(req.query.limit ? parseInt(req.query.limit) : 100);
    
    console.log(`📦 Found ${inventory.length} inventory items`);
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('❌ Get inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add item to inventory
app.post('/addToInventory', async (req, res) => {
  try {
    const {
      unitName,
      variation,
      conductionNumber,
      bodyColor,
      status,
      engineNumber,
      keyNumber,
      plateNumber,
      chassisNumber,
      notes,
      addedBy
    } = req.body;

    // Validate status for new vehicles - must be "In Stockyard" or "Available"
    const validAddStatuses = ['In Stockyard', 'Available'];
    const finalStatus = status && validAddStatuses.includes(status) ? status : 'In Stockyard';
    
    if (status && !validAddStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status for new vehicle. Only "In Stockyard" or "Available" are allowed. Default is "In Stockyard".` 
      });
    }
    
    // Validate required fields
    if (!unitName || !variation || !conductionNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Unit name, variation, and conduction number are required' 
      });
    }
    
    // Check for duplicate conduction number (unitId)
    const existingVehicle = await Inventory.findOne({
      $or: [
        { conductionNumber },
        { unitId: conductionNumber }
      ]
    });
    
    if (existingVehicle) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle with this conduction number already exists' 
      });
    }
    
    // Use conductionNumber as unitId
    const unitId = conductionNumber;
    
    const newInventoryItem = new Inventory({
      unitName,
      unitId,
      variation,
      conductionNumber,
      bodyColor,
      status: finalStatus,
      engineNumber,
      keyNumber,
      plateNumber,
      chassisNumber,
      notes,
      addedBy: addedBy || 'System',
      addedDate: new Date()
    });
    
    const savedItem = await newInventoryItem.save();
    console.log('✅ Added inventory item:', savedItem.unitId);
    
    res.json({ 
      success: true, 
      message: 'Vehicle added to inventory successfully',
      data: savedItem 
    });
  } catch (error) {
    console.error('❌ Add inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update inventory item
app.put('/updateInventoryItem/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current item to validate status transitions
    const currentItem = await Inventory.findById(id);
    if (!currentItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }

    // If status is being updated, validate the transition
    if (req.body.status && req.body.status !== currentItem.status) {
      const newStatus = req.body.status;
      const currentStatus = currentItem.status;
      
      // Status transition rules
      const validTransitions = {
        'In Stockyard': ['Available'],
        'Available': ['In Stockyard', 'Pending'], // Pending set by allocation
        'Pending': ['Available', 'In Transit'], // In Transit when driver accepts
        'In Transit': ['Available'], // When arrives at Isuzu Pasig
        'Preparing': ['Released'], // Released only by Release button
        'Released': [] // Final state
      };

      // Prevent manual setting of "Released" - must be via Release button endpoint
      if (newStatus === 'Released') {
        return res.status(400).json({ 
          success: false, 
          message: 'Status "Released" cannot be set manually. Use the Release button action.' 
        });
      }

      // Validate transition
      const allowedTransitions = validTransitions[currentStatus] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'None'}` 
        });
      }
    }
    
    const updateData = {
      ...req.body,
      lastUpdatedBy: req.body.lastUpdatedBy || 'System',
      dateUpdated: new Date()
    };
    
    const updatedItem = await Inventory.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }
    
    console.log('✅ Updated inventory item:', updatedItem.unitId);
    res.json({ 
      success: true, 
      message: 'Inventory item updated successfully',
      data: updatedItem 
    });
  } catch (error) {
    console.error('❌ Update inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete inventory item
app.delete('/deleteInventoryItem/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedItem = await Inventory.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Inventory item not found' 
      });
    }
    
    console.log('✅ Deleted inventory item:', deletedItem.unitId);
    res.json({ 
      success: true, 
      message: 'Inventory item deleted successfully',
      data: deletedItem 
    });
  } catch (error) {
    console.error('❌ Delete inventory error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('');
console.log('🔥 ADDITIONAL UNIFIED MOBILE ENDPOINTS:');
console.log('  � VEHICLE MODELS:');
console.log('    - GET  /getVehicleModels');
console.log('    - GET  /getUnitNames');
console.log('    - GET  /getVariations/:unitName');
console.log('    - POST /validateUnitVariation');
console.log('');
console.log('  �📦 INVENTORY:');
console.log('    - GET  /getInventory');
console.log('    - POST /addToInventory');
console.log('    - PUT  /updateInventoryItem/:id');
console.log('    - DELETE /deleteInventoryItem/:id');
console.log('');
console.log('  🔧 SERVICE REQUESTS:');
console.log('    - GET  /getServiceRequests');
console.log('    - POST /createServiceRequest');
console.log('    - PUT  /updateServiceRequest/:id');
console.log('');
console.log('  🚗 TEST DRIVES:');
console.log('    - GET  /getTestDrives');
console.log('    - POST /createTestDrive');
console.log('    - PUT  /updateTestDrive/:id');
console.log('');
console.log('  👥 ENHANCED USER MANAGEMENT:');
console.log('    - PUT  /updateUser/:id');
console.log('    - POST /sendPasswordReset');
console.log('');
console.log('  📊 REPORTS & ANALYTICS:');
console.log('    - GET  /getRecentActivities');
console.log('    - POST /generateReport');
console.log('');
console.log('🎯 Mobile app is now fully synced with web version!');
