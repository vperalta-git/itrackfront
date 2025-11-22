// const express = require('express');
// const router = express.Router();
// const User = require('../models/User'); // Adjust this if your User model is elsewhere

// // Login route
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email, password });

//   if (user) {
//     req.session.user = { id: user._id, email: user.email, role: user.role };
//     res.json({ success: true });
//   } else {
//     res.status(401).json({ success: false, message: 'Invalid credentials' });
//   }
// });

// // Logout route
// router.post('/logout', (req, res) => {
//   req.session.destroy(() => {
//     res.clearCookie('connect.sid');
//     res.json({ success: true });
//   });
// });

// // Auth check route
// router.get('/checkAuth', (req, res) => {
//   if (req.session.user) {
//     res.json({ authenticated: true, user: req.session.user });
//   } else {
//     res.json({ authenticated: false });
//   }
// });

const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust if needed
const { forgotPassword, resetPassword } = require('../controllers/userController');

// Login route - Updated to handle both username/email and temporary passwords
router.post('/login', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Allow login with either username or email
  const loginField = username || email;
  const query = username ? 
    { $or: [{ username: loginField }, { accountName: loginField }] } : 
    { email: loginField };
  
  try {
    // First, try to find user by login field
    const user = await User.findOne(query);
    
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
        
        // Clear temporary password after successful use
        user.temporaryPassword = undefined;
        user.temporaryPasswordExpires = undefined;
      }
    }

    // If not using temporary password, check regular password
    if (!isValidLogin && user.password === password) {
      isValidLogin = true;
    }

    if (isValidLogin) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      const sessionUser = { 
        id: user._id, 
        username: user.username,
        name: user.name || user.accountName, 
        accountName: user.accountName,
        email: user.email, 
        role: user.role 
      };
      
      req.session.user = sessionUser;
      
      const response = { 
        success: true, 
        user: sessionUser
      };
      
      // If temporary password was used, notify frontend to prompt password change
      if (isTemporaryPassword) {
        response.requirePasswordChange = true;
        response.message = 'Login successful with temporary password. Please change your password immediately.';
      }
      
      res.json(response);
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Auth check route
router.get('/checkAuth', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;