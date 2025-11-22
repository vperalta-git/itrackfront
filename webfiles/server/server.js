require('dotenv').config();

// const express = require('express')
// const mongoose = require('mongoose')
// const cors = require('cors')
// const userRoutes = require('./routes/userRoutes')
// const servicerequestRoutes = require('./routes/servicerequestRoutes')
// const inventoryRoutes = require('./routes/inventoryRoutes')


// const app = express();
// app.use(cors());
// app.use(express.json())
// app.use(express.urlencoded({extended:true}));

// // mongoose.connect("mongodb://localhost:27017/db2")
// mongoose.connect("mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0")
//     .then(() => console.log('Connected to MongoDB Atlas'))
//     .catch(err => console.error('MongoDB connection error:', err));


// app.use('/api',userRoutes)
// app.use('/api',servicerequestRoutes)
// app.use('/api',inventoryRoutes)


// app.listen(8000, ()=>{
//     console.log("Server is running")
// })



require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const servicerequestRoutes = require('./routes/servicerequestRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const driverallocationRoutes = require('./routes/driverallocationRoutes');
// const testdriveRoutes = require('./routes/testdriveRoutes');
const durationRoutes = require('./routes/durationRoutes');
const auditTrailRoutes = require('./routes/auditTrailRoutes');
const vehicleModelRoutes = require('./routes/vehicleModelRoutes');

const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://itrackfrontend1.vercel.app'
  ], // React frontend (local and Vercel)
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'yourSecretKeyHere',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

// MongoDB connection

// mongoose.connect("mongodb://localhost:27017/db2")
mongoose.connect("mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0")
//   .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth endpoints (you’ll need to create these)
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes);

// routes
app.use('/api', userRoutes);
app.use('/api', servicerequestRoutes);
app.use('/api', inventoryRoutes);
// app.use('/api', testdriveRoutes);
app.use('/api', driverallocationRoutes);
app.use('/api', durationRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api', vehicleModelRoutes);

// Import models for location management endpoints
const InventoryModel = require('./models/Inventory');
const DriverallocationModel = require('./models/Driverallocation');

// ============= LOCATION MANAGEMENT API ENDPOINTS =============

// Update vehicle location
app.post('/api/vehicle-location/update', async (req, res) => {
  try {
    const { unitId, latitude, longitude, address } = req.body;

    if (!unitId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID, latitude, and longitude are required'
      });
    }

    const updatedVehicle = await InventoryModel.findOneAndUpdate(
      { unitId },
      {
        location: {
          latitude,
          longitude,
          address: address || 'GPS Coordinates',
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`📍 Updated vehicle ${unitId} location: ${latitude}, ${longitude}`);
    res.json({
      success: true,
      message: 'Vehicle location updated successfully',
      data: updatedVehicle
    });

  } catch (error) {
    console.error('Error updating vehicle location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update allocation location
app.post('/api/allocation-location/update', async (req, res) => {
  try {
    const { 
      unitId, 
      currentLatitude, 
      currentLongitude, 
      currentAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryAddress,
      customerName,
      contactNumber
    } = req.body;

    if (!unitId || !currentLatitude || !currentLongitude) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID, current latitude, and current longitude are required'
      });
    }

    const updateData = {
      currentLocation: {
        latitude: currentLatitude,
        longitude: currentLongitude,
        address: currentAddress || 'GPS Coordinates',
        lastUpdated: new Date()
      }
    };

    // Add delivery location if provided
    if (deliveryLatitude && deliveryLongitude) {
      updateData.deliveryLocation = {
        latitude: deliveryLatitude,
        longitude: deliveryLongitude,
        address: deliveryAddress || 'Delivery Address',
        customerName: customerName || 'Customer',
        contactNumber: contactNumber || ''
      };
    }

    const updatedAllocation = await DriverallocationModel.findOneAndUpdate(
      { unitId },
      updateData,
      { new: true }
    );

    if (!updatedAllocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    console.log(`📍 Updated allocation ${unitId} locations`);
    res.json({
      success: true,
      message: 'Allocation location updated successfully',
      data: updatedAllocation
    });

  } catch (error) {
    console.error('Error updating allocation location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get vehicles with locations
app.get('/api/vehicles-with-locations', async (req, res) => {
  try {
    const vehicles = await InventoryModel.find({});
    
    const vehiclesWithLocationStatus = vehicles.map(vehicle => ({
      _id: vehicle._id,
      unitId: vehicle.unitId,
      unitName: vehicle.unitName,
      bodyColor: vehicle.bodyColor,
      variation: vehicle.variation,
      hasLocation: !!(vehicle.location?.latitude && vehicle.location?.longitude),
      location: vehicle.location || null
    }));

    const withLocations = vehiclesWithLocationStatus.filter(v => v.hasLocation);
    const withoutLocations = vehiclesWithLocationStatus.filter(v => !v.hasLocation);

    res.json({
      success: true,
      data: {
        total: vehicles.length,
        withLocations: withLocations.length,
        withoutLocations: withoutLocations.length,
        vehicles: vehiclesWithLocationStatus
      }
    });

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get allocations with locations
app.get('/api/allocations-with-locations', async (req, res) => {
  try {
    const allocations = await DriverallocationModel.find({});
    
    const allocationsWithLocationStatus = allocations.map(allocation => ({
      _id: allocation._id,
      unitId: allocation.unitId,
      unitName: allocation.unitName,
      assignedDriver: allocation.assignedDriver,
      status: allocation.status,
      hasCurrentLocation: !!(allocation.currentLocation?.latitude && allocation.currentLocation?.longitude),
      hasDeliveryLocation: !!(allocation.deliveryLocation?.latitude && allocation.deliveryLocation?.longitude),
      currentLocation: allocation.currentLocation || null,
      deliveryLocation: allocation.deliveryLocation || null
    }));

    const withCurrentLocations = allocationsWithLocationStatus.filter(a => a.hasCurrentLocation);
    const withDeliveryLocations = allocationsWithLocationStatus.filter(a => a.hasDeliveryLocation);

    res.json({
      success: true,
      data: {
        total: allocations.length,
        withCurrentLocations: withCurrentLocations.length,
        withDeliveryLocations: withDeliveryLocations.length,
        allocations: allocationsWithLocationStatus
      }
    });

  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Batch update vehicle locations
app.post('/api/batch-update-vehicle-locations', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { unitId, latitude, longitude, address }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];

    for (const update of updates) {
      const { unitId, latitude, longitude, address } = update;

      if (!unitId || !latitude || !longitude) {
        results.push({ unitId, success: false, message: 'Missing required fields' });
        continue;
      }

      try {
        const updatedVehicle = await InventoryModel.findOneAndUpdate(
          { unitId },
          {
            location: {
              latitude,
              longitude,
              address: address || 'Batch Updated Location',
              lastUpdated: new Date()
            }
          },
          { new: true }
        );

        if (updatedVehicle) {
          results.push({ unitId, success: true, message: 'Updated successfully' });
        } else {
          results.push({ unitId, success: false, message: 'Vehicle not found' });
        }
      } catch (error) {
        results.push({ unitId, success: false, message: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📍 Batch update completed: ${successful} successful, ${failed} failed`);

    res.json({
      success: true,
      message: `Batch update completed: ${successful} successful, ${failed} failed`,
      data: {
        successful,
        failed,
        results
      }
    });

  } catch (error) {
    console.error('Error in batch update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============= END LOCATION MANAGEMENT ENDPOINTS =============

// Add DriverallocationModel import for location endpoints
app.post('/api/allocation-location/update', async (req, res) => {
  try {
    const { 
      unitId, 
      currentLatitude, 
      currentLongitude, 
      currentAddress,
      deliveryLatitude,
      deliveryLongitude,
      deliveryAddress,
      customerName,
      contactNumber
    } = req.body;

    if (!unitId) {
      return res.status(400).json({
        success: false,
        message: 'Unit ID is required'
      });
    }

    const updateData = {};

    // Update current location if provided
    if (currentLatitude && currentLongitude) {
      updateData.currentLocation = {
        latitude: currentLatitude,
        longitude: currentLongitude,
        address: currentAddress || 'Current Location',
        lastUpdated: new Date()
      };
    }

    // Update delivery location if provided
    if (deliveryLatitude && deliveryLongitude) {
      updateData.deliveryLocation = {
        latitude: deliveryLatitude,
        longitude: deliveryLongitude,
        address: deliveryAddress || 'Delivery Location',
        customerName: customerName || 'Customer',
        contactNumber: contactNumber || ''
      };
    }

    const updatedAllocation = await DriverallocationModel.findOneAndUpdate(
      { unitId },
      updateData,
      { new: true }
    );

    if (!updatedAllocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    console.log(`📍 Updated allocation ${unitId} locations`);
    res.json({
      success: true,
      message: 'Allocation locations updated successfully',
      data: updatedAllocation
    });

  } catch (error) {
    console.error('Error updating allocation locations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get vehicles with their locations
app.get('/api/vehicles-with-locations', async (req, res) => {
  try {
    const vehicles = await InventoryModel.find({});
    
    const vehiclesWithLocationStatus = vehicles.map(vehicle => ({
      _id: vehicle._id,
      unitId: vehicle.unitId,
      unitName: vehicle.unitName,
      bodyColor: vehicle.bodyColor,
      variation: vehicle.variation,
      hasLocation: !!(vehicle.location?.latitude && vehicle.location?.longitude),
      location: vehicle.location || null
    }));

    const stats = {
      total: vehicles.length,
      withLocations: vehiclesWithLocationStatus.filter(v => v.hasLocation).length,
      withoutLocations: vehiclesWithLocationStatus.filter(v => !v.hasLocation).length
    };

    res.json({
      success: true,
      data: vehiclesWithLocationStatus,
      stats
    });

  } catch (error) {
    console.error('Error fetching vehicles with locations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get allocations with their locations
app.get('/api/allocations-with-locations', async (req, res) => {
  try {
    const allocations = await DriverallocationModel.find({});
    
    const allocationsWithLocationStatus = allocations.map(allocation => ({
      _id: allocation._id,
      unitId: allocation.unitId,
      unitName: allocation.unitName,
      assignedDriver: allocation.assignedDriver,
      status: allocation.status,
      hasCurrentLocation: !!(allocation.currentLocation?.latitude && allocation.currentLocation?.longitude),
      hasDeliveryLocation: !!(allocation.deliveryLocation?.latitude && allocation.deliveryLocation?.longitude),
      currentLocation: allocation.currentLocation || null,
      deliveryLocation: allocation.deliveryLocation || null
    }));

    const stats = {
      total: allocations.length,
      withCurrentLocation: allocationsWithLocationStatus.filter(a => a.hasCurrentLocation).length,
      withDeliveryLocation: allocationsWithLocationStatus.filter(a => a.hasDeliveryLocation).length,
      withBothLocations: allocationsWithLocationStatus.filter(a => a.hasCurrentLocation && a.hasDeliveryLocation).length
    };

    res.json({
      success: true,
      data: allocationsWithLocationStatus,
      stats
    });

  } catch (error) {
    console.error('Error fetching allocations with locations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Batch update vehicle locations
app.post('/api/batch-update-vehicle-locations', async (req, res) => {
  try {
    const { vehicles, defaultLocation } = req.body;

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicles array is required'
      });
    }

    let updatedCount = 0;
    const results = [];

    for (const vehicleData of vehicles) {
      const { unitId, latitude, longitude, address } = vehicleData;
      
      const locationToUse = {
        latitude: latitude || defaultLocation?.latitude,
        longitude: longitude || defaultLocation?.longitude,
        address: address || defaultLocation?.address || 'Updated Location',
        lastUpdated: new Date()
      };

      if (!locationToUse.latitude || !locationToUse.longitude) {
        results.push({
          unitId,
          success: false,
          message: 'Missing coordinates'
        });
        continue;
      }

      try {
        const updatedVehicle = await InventoryModel.findOneAndUpdate(
          { unitId },
          { location: locationToUse },
          { new: true }
        );

        if (updatedVehicle) {
          updatedCount++;
          results.push({
            unitId,
            success: true,
            message: 'Location updated'
          });
        } else {
          results.push({
            unitId,
            success: false,
            message: 'Vehicle not found'
          });
        }
      } catch (error) {
        results.push({
          unitId,
          success: false,
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Batch update completed. ${updatedCount} vehicles updated.`,
      updatedCount,
      results
    });

  } catch (error) {
    console.error('Error in batch update:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ✅ Start server (only once!)
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});
