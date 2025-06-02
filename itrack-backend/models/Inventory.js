// models/Inventory.js  (for inventories collection aka vehicle stocks)
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  unitName: String,
  unitId: String,         // match MongoDB field name exactly
  bodyColor: String,
  variation: String,
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema, 'inventories'); // explicit collection name
