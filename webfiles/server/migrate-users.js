// Migration script to update existing users with new fields
// Run this once after updating the User model

const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect("mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const migrateUsers = async () => {
  try {
    console.log('Starting user migration...');
    
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      const updates = {};
      
      // Set default values for new fields
      if (!user.username) {
        updates.username = user.name || user.accountName || `user_${user._id}`;
      }
      
      if (!user.accountName && user.name) {
        updates.accountName = user.name;
      }
      
      if (!user.phoneNumber && user.phoneno) {
        updates.phoneNumber = user.phoneno;
      }
      
      if (!user.dateJoined) {
        updates.dateJoined = user._id.getTimestamp(); // Use ObjectId timestamp as join date
      }
      
      if (!user.isActive) {
        updates.isActive = true;
      }
      
      // Update user if there are changes
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log(`Updated user: ${user.name || user._id} with fields: ${Object.keys(updates).join(', ')}`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateUsers();
