const User = require('../models/User');

// Login function
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📥 Login attempt:', username);
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Find user by username (case insensitive) or accountName
    const user = await User.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        { accountName: username }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
    if (!isValidLogin && user.password === password) {
      isValidLogin = true;
      console.log('🔑 User logged in with regular password:', username);
    }

    if (!isValidLogin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create session
    const sessionUser = {
      id: user._id,
      username: user.username,
      accountName: user.accountName,
      email: user.email,
      role: user.role,
      assignedTo: user.assignedTo
    };

    req.session.user = sessionUser;

    const response = {
      success: true,
      message: 'Login successful',
      user: sessionUser
    };

    // If temporary password was used, notify frontend to prompt password change
    if (isTemporaryPassword) {
      response.requirePasswordChange = true;
      response.message = 'Login successful with temporary password. Please change your password immediately.';
      console.log('⚠️  User should change password immediately:', username);
    }

    res.json(response);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username accountName email role isActive lastLogin').lean();
    console.log(`👥 Retrieved ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, role, name, email, phone, assignedTo, accountName } = req.body;
    
    console.log('📝 Creating user with data:', { username, role, accountName: accountName || name || username });
    
    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, and role are required' 
      });
    }
    
    // Validate role
    const validRoles = ['Admin', 'Supervisor', 'Manager', 'Sales Agent', 'Driver', 'Dispatch'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
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
      username: username.toLowerCase().trim(),
      password: password, // In production, this should be hashed
      role: role,
      name: name || username,
      email: email || '',
      phone: phone || '',
      assignedTo: assignedTo || null,
      accountName: accountName || name || username,
      isActive: true,
      date: new Date()
    });
    
    await newUser.save();
    
    // Return user without password
    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;
    
    console.log('✅ Created user:', username, 'with role:', role, 'accountName:', userResponse.accountName);
    res.json({ success: true, message: 'User created successfully', data: userResponse });
  } catch (error) {
    console.error('❌ Create user error:', error);
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'Username already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};