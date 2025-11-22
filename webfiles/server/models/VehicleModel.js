const mongoose = require('mongoose');

// Schema for storing vehicle models and their variations
const VehicleModelSchema = new mongoose.Schema({
  unitName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  variations: [{
    type: String,
    required: true,
    trim: true
  }],
  category: {
    type: String,
    enum: ['Pickup', 'SUV', 'Commercial', 'Truck', 'Heavy Duty'],
    default: 'Commercial'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Index for faster queries
VehicleModelSchema.index({ unitName: 1 });
VehicleModelSchema.index({ isActive: 1 });

// Virtual to get variation count
VehicleModelSchema.virtual('variationCount').get(function() {
  return this.variations.length;
});

// Instance method to add a variation
VehicleModelSchema.methods.addVariation = function(variation) {
  if (!this.variations.includes(variation)) {
    this.variations.push(variation);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove a variation
VehicleModelSchema.methods.removeVariation = function(variation) {
  this.variations = this.variations.filter(v => v !== variation);
  return this.save();
};

// Static method to find unit by variation
VehicleModelSchema.statics.findUnitByVariation = function(variation) {
  return this.findOne({ 
    variations: variation, 
    isActive: true 
  });
};

// Static method to get all active units
VehicleModelSchema.statics.getActiveUnits = function() {
  return this.find({ isActive: true }, 'unitName category')
    .sort({ unitName: 1 });
};

// Static method to get variations for a unit
VehicleModelSchema.statics.getVariationsForUnit = function(unitName) {
  return this.findOne({ unitName, isActive: true }, 'variations')
    .then(result => result ? result.variations : []);
};

// Static method to validate unit-variation pair
VehicleModelSchema.statics.isValidPair = function(unitName, variation) {
  return this.findOne({ 
    unitName, 
    variations: variation, 
    isActive: true 
  }).then(result => !!result);
};

const VehicleModel = mongoose.model('VehicleModel', VehicleModelSchema);

module.exports = VehicleModel;