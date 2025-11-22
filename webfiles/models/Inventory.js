// models/Inventory.js  (for inventories collection aka vehicle stocks)
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  unitName: String,
  unitId: String,         // match MongoDB field name exactly
  bodyColor: String,
  variation: String,
  
  // GPS Location for Maps
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: 'Isuzu Dealership' },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Vehicle Status with validation
  status: { 
    type: String, 
    enum: ['In Stockyard', 'Available', 'Pending', 'In Transit', 'Preparing', 'Released'],
    default: 'In Stockyard' // Default status when vehicle is added
  },
  
  // Driver allocation info (for status validation)
  assignedDriver: { type: String, default: null },
  driverAccepted: { type: Boolean, default: false },
  
  // Agent assignment info
  assignedAgent: { type: String, default: null },
  
  // Additional vehicle info
  model: String,
  year: Number,
  vin: String,
  quantity: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema, 'inventories'); // explicit collection name
