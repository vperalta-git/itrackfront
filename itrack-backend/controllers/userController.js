const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      console.log('👥 Getting all users...');
      const users = await User.find({}, { password: 0 }); // Exclude passwords
      console.log(`Found ${users.length} users`);
      res.json(users);
    } catch (error) {
      console.error('❌ Get all users error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`👤 Getting user by ID: ${id}`);
      
      const user = await User.findById(id, { password: 0 });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`✅ User found: ${user.username}`);
      res.json(user);
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const { username, password, role, ...userData } = req.body;
      console.log(`➕ Creating new user: ${username} (${role})`);
      
      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password if provided
      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      const user = new User({
        ...userData,
        username,
        role,
        password: hashedPassword
      });
      
      const savedUser = await user.save();
      const { password: _, ...userResponse } = savedUser.toObject();
      
      console.log(`✅ User created successfully: ${savedUser.username}`);
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('❌ Create user error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { password, ...updateData } = req.body;
      
      console.log(`✏️ Updating user: ${id}`);
      
      // If password is being updated, hash it
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`✅ User updated successfully: ${user.username}`);
      res.json(user);
    } catch (error) {
      console.error('❌ Update user error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`🗑️ Deleting user: ${id}`);
      
      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`✅ User deleted successfully: ${user.username}`);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get users by role
  getUsersByRole: async (req, res) => {
    try {
      const { role } = req.params;
      console.log(`🎭 Getting users by role: ${role}`);
      
      const users = await User.find({ role }, { password: 0 });
      console.log(`Found ${users.length} users with role ${role}`);
      res.json(users);
    } catch (error) {
      console.error('❌ Get users by role error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get agents assigned to manager
  getManagerAgents: async (req, res) => {
    try {
      const { managerId } = req.params;
      console.log(`👨‍💼 Getting agents for manager: ${managerId}`);
      
      const agents = await User.find({ 
        assignedTo: managerId, 
        role: 'Sales Agent' 
      }, { password: 0 });
      
      console.log(`Found ${agents.length} agents assigned to manager`);
      res.json(agents);
    } catch (error) {
      console.error('❌ Get manager agents error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all managers for assignment
  getAllManagers: async (req, res) => {
    try {
      console.log('👨‍💼 Getting all managers...');
      const managers = await User.find({ role: 'Manager' }, { password: 0 });
      console.log(`Found ${managers.length} managers`);
      res.json(managers);
    } catch (error) {
      console.error('❌ Get managers error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get dashboard stats for user
  getUserDashboardStats: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId, { password: 0 });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let stats = {
        role: user.role,
        username: user.username,
        totalAssigned: 0,
        activeAllocations: 0,
        completedToday: 0
      };

      // Add role-specific stats
      if (user.role === 'Manager') {
        const agents = await User.find({ assignedTo: userId, role: 'Sales Agent' });
        stats.totalAgents = agents.length;
      }

      console.log(`📊 Dashboard stats for ${user.username}: ${JSON.stringify(stats)}`);
      res.json(stats);
    } catch (error) {
      console.error('❌ Get dashboard stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = userController;
