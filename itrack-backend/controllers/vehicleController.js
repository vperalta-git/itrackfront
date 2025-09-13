const Vehicle = require('../models/Vehicle');

const vehicleController = {
  // Get all vehicles
  getAllVehicles: async (req, res) => {
    try {
      const vehicles = await Vehicle.find();
      res.json(vehicles);
    } catch (error) {
      console.error('Get all vehicles error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get vehicle by ID
  getVehicleById: async (req, res) => {
    try {
      const vehicle = await Vehicle.findById(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Get vehicle by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Create new vehicle
  createVehicle: async (req, res) => {
    try {
      const vehicle = new Vehicle(req.body);
      const savedVehicle = await vehicle.save();
      res.status(201).json(savedVehicle);
    } catch (error) {
      console.error('Create vehicle error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Update vehicle
  updateVehicle: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Update vehicle error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  // Delete vehicle
  deleteVehicle: async (req, res) => {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get vehicle locations for maps - CRITICAL FOR MAPS FUNCTIONALITY
  getVehicleLocations: async (req, res) => {
    try {
      const vehicles = await Vehicle.find({}, {
        unitId: 1,
        model: 1,
        status: 1,
        currentLocation: 1,
        assignedTo: 1,
        year: 1,
        color: 1
      });
      
      const locations = vehicles.map(vehicle => ({
        id: vehicle._id,
        unitId: vehicle.unitId,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        status: vehicle.status,
        latitude: vehicle.currentLocation?.latitude || (14.5995 + (Math.random() - 0.5) * 0.02),
        longitude: vehicle.currentLocation?.longitude || (120.9842 + (Math.random() - 0.5) * 0.02),
        assignedTo: vehicle.assignedTo
      }));
      
      res.json({ success: true, locations });
    } catch (error) {
      console.error('Get vehicle locations error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = vehicleController;
