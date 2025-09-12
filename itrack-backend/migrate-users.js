// Migration script to update existing users with new profile fields
// Run this once after updating the User model

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 
  'mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User model
const User = require('./models/User');

const migrateUsers = async () => {
  try {
    console.log('🔄 Starting user profile migration...');
    
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      const updates = {};
      
      // Set default values for new fields if they don't exist
      if (!user.isActive && user.isActive !== false) {
        updates.isActive = true;
      }
      
      if (!user.createdBy) {
        updates.createdBy = 'Migration';
      }
      
      if (!user.updatedBy) {
        updates.updatedBy = 'Migration';
      }
      
      // Ensure accountName exists
      if (!user.accountName && user.username) {
        updates.accountName = user.username;
      }
      
      // Update user if there are changes
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        console.log(`✅ Updated user: ${user.username || user._id} with fields: ${Object.keys(updates).join(', ')}`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📈 Users updated: ${updatedCount} out of ${users.length}`);
    console.log(`\n🚀 New profile features now available:`);
    console.log(`   • Profile pictures`);
    console.log(`   • Contact information`);
    console.log(`   • Emergency contacts`);
    console.log(`   • Manager assignments`);
    console.log(`   • Employment details`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

console.log('🧬 I-Track User Profile Migration Script');
console.log('========================================');
migrateUsers();
