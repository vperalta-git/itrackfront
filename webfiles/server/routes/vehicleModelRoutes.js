const express = require('express');
const router = express.Router();
const {
  initializeVehicleModels,
  getAllVehicleModels,
  getUnitNames,
  getVariationsForUnit,
  validateUnitVariationPair,
  createVehicleModel,
  updateVehicleModel,
  deleteVehicleModel,
  addVariationToModel,
  removeVariationFromModel
} = require('../controllers/vehicleModelController');

// Initialize default vehicle models data
router.post('/vehicle-models/initialize', initializeVehicleModels);

// Get all vehicle models
router.get('/vehicle-models', getAllVehicleModels);

// Get unit names only
router.get('/vehicle-models/units', getUnitNames);

// Get variations for a specific unit
router.get('/vehicle-models/:unitName/variations', getVariationsForUnit);

// Validate unit-variation pair
router.post('/vehicle-models/validate', validateUnitVariationPair);

// Create new vehicle model
router.post('/vehicle-models/create', createVehicleModel);

// Update existing vehicle model
router.put('/vehicle-models/:id', updateVehicleModel);

// Delete vehicle model (soft delete)
router.delete('/vehicle-models/:id', deleteVehicleModel);

// Add variation to existing model
router.post('/vehicle-models/:id/variations/add', addVariationToModel);

// Remove variation from existing model
router.post('/vehicle-models/:id/variations/remove', removeVariationFromModel);

module.exports = router;