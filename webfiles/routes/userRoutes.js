const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('assignedTo', 'accountName username')
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('assignedTo', 'accountName username')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password; // Don't allow password updates through this endpoint
    delete updateData.username; // Don't allow username changes
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedBy: req.body.updatedBy || 'User' },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'accountName username').select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Upload profile picture
router.post('/profile/:id/upload-picture', async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ error: 'Profile picture data is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { profilePicture, updatedBy: req.body.updatedBy || 'User' },
      { new: true }
    ).select('profilePicture');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: 'Profile picture updated successfully', 
      profilePicture: user.profilePicture 
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get managers for assignment
router.get('/managers', async (req, res) => {
  try {
    const managers = await User.find({ 
      role: 'Manager', 
      isActive: true 
    }).select('_id accountName username email');
    
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

// Get agents by manager
router.get('/agents/:managerId', async (req, res) => {
  try {
    const agents = await User.find({ 
      assignedTo: req.params.managerId,
      isActive: true 
    }).select('_id accountName username email role');
    
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const newUser = new User({
      ...req.body,
      createdBy: req.body.createdBy || 'Admin'
    });
    
    const savedUser = await newUser.save();
    const userResponse = await User.findById(savedUser._id)
      .populate('assignedTo', 'accountName username')
      .select('-password');
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy || 'Admin' },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'accountName username').select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: req.body.updatedBy || 'Admin' },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Authentication routes
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }],
      password,
      isActive: true 
    }).populate('assignedTo', 'accountName username');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Return user data (excluding password)
    const { password: _, ...userResponse } = user.toObject();
    
    res.json({ 
      success: true, 
      user: userResponse 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

module.exports = router;
