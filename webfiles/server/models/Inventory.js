const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  unitName: { type: String },
  unitId: { type: String },
  bodyColor: { type: String },
  variation: { type: String },
  quantity: { type: Number, default: 1 },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true // ✅ This ensures createdAt & updatedAt are auto-added
});


const InventoryModel = mongoose.model("Inventory", InventorySchema);
module.exports = InventoryModel;
