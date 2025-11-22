/**
 * Migration Script: Update Driver Allocation Status
 * 
 * This script updates all driver allocations with status 'Assigned' to 'Pending'
 * to match the new status flow: Pending → In Transit → Delivered
 * 
 * Usage:
 * 1. Ensure MongoDB is running and server.js is active
 * 2. Run: node migrate-allocation-status.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './itrack-backend/.env' });

// MongoDB connection URI - Using Atlas connection from .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/itrack';

// Driver Allocation Schema
const driverAllocationSchema = new mongoose.Schema({
  unitName: String,
  unitId: String,
  bodyColor: String,
  variation: String,
  assignedDriver: String,
  assignedDriverEmail: String,
  assignedAgent: String,
  status: String,
  allocatedBy: String,
  date: Date,
  pickupLocation: Object,
  destination: Object,
  customerName: String,
  customerPhone: String,
  deliveryInstructions: String,
  route: Object
}, { collection: 'driverallocations', strict: false });

const DriverAllocation = mongoose.model('DriverAllocation', driverAllocationSchema);

async function migrateStatus() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all allocations with 'Assigned' status
    console.log('🔍 Finding allocations with "Assigned" status...');
    const assignedAllocations = await DriverAllocation.find({ 
      status: { $in: ['Assigned', 'assigned', 'ASSIGNED'] }
    });
    
    if (assignedAllocations.length === 0) {
      console.log('✅ No allocations with "Assigned" status found. Migration not needed.\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Found ${assignedAllocations.length} allocation(s) to update:\n`);
    
    assignedAllocations.forEach((allocation, index) => {
      console.log(`   ${index + 1}. ${allocation.unitName} (${allocation.unitId})`);
      console.log(`      Driver: ${allocation.assignedDriver}`);
      console.log(`      Current Status: ${allocation.status}`);
      console.log(`      Date: ${allocation.date}\n`);
    });

    // Update all to 'Pending'
    console.log('🔄 Updating status to "Pending"...');
    const result = await DriverAllocation.updateMany(
      { status: { $in: ['Assigned', 'assigned', 'ASSIGNED'] } },
      { $set: { status: 'Pending' } }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   Modified count: ${result.modifiedCount}`);
    console.log(`   Matched count: ${result.matchedCount}\n`);

    // Verify the update
    console.log('🔍 Verifying migration...');
    const remainingAssigned = await DriverAllocation.find({ 
      status: { $in: ['Assigned', 'assigned', 'ASSIGNED'] }
    });

    if (remainingAssigned.length === 0) {
      console.log('✅ Verification passed: No "Assigned" status allocations remaining.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingAssigned.length} allocation(s) still have "Assigned" status.\n`);
    }

    // Show updated allocations
    const pendingAllocations = await DriverAllocation.find({ status: 'Pending' });
    console.log(`📊 Current status distribution:`);
    console.log(`   Pending: ${pendingAllocations.length}`);
    
    const inTransit = await DriverAllocation.find({ status: { $in: ['In Transit', 'in transit'] } });
    console.log(`   In Transit: ${inTransit.length}`);
    
    const delivered = await DriverAllocation.find({ status: { $in: ['Delivered', 'delivered'] } });
    console.log(`   Delivered: ${delivered.length}\n`);

    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run migration
console.log('\n================================');
console.log('  ALLOCATION STATUS MIGRATION');
console.log('================================\n');

migrateStatus();
