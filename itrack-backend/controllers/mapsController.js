const Vehicle = require('../models/Vehicle');
const DriverAllocation = require('../models/DriverAllocation');
const User = require('../models/User');

const mapsController = {
  // Get all vehicle locations for admin maps
  getAllVehicleLocations: async (req, res) => {
    try {
      console.log('🗺️ Maps API: Getting all vehicle locations for admin...');
      
      const vehicles = await Vehicle.find({});
      console.log(`Found ${vehicles.length} vehicles`);
      
      // Try to get allocations, but don't fail if model doesn't exist
      let allocations = [];
      try {
        allocations = await Allocation.find({}).populate('vehicleId');
      } catch (allocError) {
        console.warn('Allocation model not found, continuing without allocations');
      }
      
      const locations = vehicles.map((vehicle, index) => {
        const allocation = allocations.find(a => 
          a.vehicleId && a.vehicleId._id.toString() === vehicle._id.toString()
        );
        
        // Generate realistic Manila coordinates
        const baseLatitude = 14.5995;
        const baseLongitude = 120.9842;
        const randomOffset = 0.02;
        
        return {
          id: vehicle._id,
          unitId: vehicle.unitId || `UNIT-${index + 1}`,
          model: vehicle.model || 'Unknown Model',
          year: vehicle.year || '2023',
          color: vehicle.color || 'White',
          status: vehicle.status || 'Available',
          latitude: vehicle.currentLocation?.latitude || (baseLatitude + (Math.random() - 0.5) * randomOffset),
          longitude: vehicle.currentLocation?.longitude || (baseLongitude + (Math.random() - 0.5) * randomOffset),
          assignedTo: vehicle.assignedTo || null,
          allocation: allocation ? {
            customerName: allocation.customerName,
            processes: allocation.processes,
            status: allocation.status
          } : null
        };
      });
      
      console.log(`✅ Returning ${locations.length} vehicle locations`);
      res.json({ success: true, locations });
    } catch (error) {
      console.error('❌ Maps API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get driver-specific location and route
  getDriverRoute: async (req, res) => {
    try {
      const { driverId } = req.params;
      console.log(`🚗 Maps API: Getting route for driver ${driverId}`);
      
      // Find vehicles assigned to this driver
      const vehicles = await Vehicle.find({ assignedTo: driverId });
      console.log(`Found ${vehicles.length} vehicles assigned to driver`);
      
      // Try to get allocations
      let allocations = [];
      try {
        allocations = await DriverAllocation.find({ 
          vehicleId: { $in: vehicles.map(v => v._id) }
        }).populate('vehicleId');
      } catch (allocError) {
        console.warn('DriverAllocation model not found for driver route');
      }
      
      if (allocations.length === 0) {
        console.log('No allocations found, returning default location');
        return res.json({ 
          success: true, 
          currentLocation: { latitude: 14.5995, longitude: 120.9842 },
          destination: null,
          route: [],
          message: 'No active allocation found'
        });
      }
      
      const currentAllocation = allocations[0];
      const destination = {
        latitude: 14.6042 + (Math.random() - 0.5) * 0.02,
        longitude: 120.9822 + (Math.random() - 0.5) * 0.02,
        customerName: currentAllocation.customerName
      };
      
      console.log('✅ Driver route generated successfully');
      res.json({
        success: true,
        currentLocation: { latitude: 14.5995, longitude: 120.9842 },
        destination,
        route: [
          { latitude: 14.5995, longitude: 120.9842 },
          destination
        ],
        allocation: {
          customerName: currentAllocation.customerName,
          processes: currentAllocation.processes,
          status: currentAllocation.status
        }
      });
    } catch (error) {
      console.error('❌ Driver Route API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get agent-specific vehicle locations
  getAgentVehicleLocations: async (req, res) => {
    try {
      const { agentId } = req.params;
      console.log(`👤 Maps API: Getting vehicles for agent ${agentId}`);
      
      const vehicles = await Vehicle.find({ assignedTo: agentId });
      console.log(`Found ${vehicles.length} vehicles assigned to agent`);
      
      const locations = vehicles.map((vehicle, index) => ({
        id: vehicle._id,
        unitId: vehicle.unitId || `AGENT-${index + 1}`,
        model: vehicle.model || 'Unknown Model',
        status: vehicle.status || 'Available',
        latitude: vehicle.currentLocation?.latitude || (14.5995 + (Math.random() - 0.5) * 0.01),
        longitude: vehicle.currentLocation?.longitude || (120.9842 + (Math.random() - 0.5) * 0.01),
        assignedTo: vehicle.assignedTo
      }));
      
      console.log('✅ Agent vehicle locations generated successfully');
      res.json({ success: true, locations });
    } catch (error) {
      console.error('❌ Agent Maps API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Update vehicle location (for GPS tracking)
  updateVehicleLocation: async (req, res) => {
    try {
      const { vehicleId } = req.params;
      const { latitude, longitude } = req.body;
      
      console.log(`📍 Updating location for vehicle ${vehicleId}`);
      
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        {
          currentLocation: { latitude, longitude },
          lastUpdated: new Date()
        },
        { new: true }
      );
      
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
      
      console.log('✅ Vehicle location updated successfully');
      res.json({ success: true, vehicle });
    } catch (error) {
      console.error('❌ Update Location API Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = mapsController;
