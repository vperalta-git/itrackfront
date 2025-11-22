const VehicleModel = require('../models/VehicleModel');
const logAudit = require('./logAudit');

// Initialize default vehicle models data
const initializeVehicleModels = async (req, res) => {
  try {
    const defaultModels = {
      "Isuzu D-Max": [
        "Cab and Chassis",
        "CC Utility Van Dual AC",
        "4x2 LT MT",
        "4x4 LT MT",
        "4x2 LS-A MT",
        "4x2 LS-A MT Plus",
        "4x2 LS-A AT",
        "4x2 LS-A AT Plus",
        "4x4 LS-A MT",
        "4x4 LS-A MT Plus",
        "4x2 LS-E AT",
        "4x4 LS-E AT",
        "4x4 Single Cab MT"
      ],
      "Isuzu MU-X": [
        "1.9L MU-X 4x2 LS AT",
        "3.0L MU-X 4x2 LS-A AT",
        "3.0L MU-X 4x2 LS-E AT",
        "3.0L MU-X 4x4 LS-E AT"
      ],
      "Isuzu Traviz": [
        "SWB 2.5L 4W 9FT Cab & Chassis",
        "SWB 2.5L 4W 9FT Utility Van Dual AC",
        "LWB 2.5L 4W 10FT Cab & Chassis",
        "LWB 2.5L 4W 10FT Utility Van Dual AC",
        "LWB 2.5L 4W 10FT Aluminum Van",
        "LWB 2.5L 4W 10FT Aluminum Van w/ Single AC",
        "LWB 2.5L 4W 10FT Dropside Body",
        "LWB 2.5L 4W 10FT Dropside Body w/ Single AC"
      ],
      "Isuzu QLR Series": [
        "QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis",
        "QLR77 E Tilt Utility Van w/o AC",
        "QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis",
        "QLR77 E Non-Tilt Utility Van w/o AC",
        "QLR77 E Non-Tilt Utility Van Dual AC"
      ],
      "Isuzu NLR Series": [
        "NLR77 H Tilt 3.0L 4W 14ft 60A",
        "NLR77 H Jeepney Chassis (135A)",
        "NLR85 Tilt 3.0L 4W 10ft 90A",
        "NLR85E Smoother"
      ],
      "Isuzu NMR Series": [
        "NMR85H Smoother",
        "NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC"
      ],
      "Isuzu NPR Series": [
        "NPR85 Tilt 3.0L 6W 16ft 90A",
        "NPR85 Cabless for Armored"
      ],
      "Isuzu NPS Series": [
        "NPS75 H 3.0L 6W 16ft 90A"
      ],
      "Isuzu NQR Series": [
        "NQR75L Smoother",
        "NQR75 Tilt 5.2L 6W 18ft 90A"
      ],
      "Isuzu FRR Series": [
        "FRR90M 6W 20ft 5.2L",
        "FRR90M Smoother"
      ],
      "Isuzu FTR Series": [
        "FTR90M 6W 19ft 5.2L"
      ],
      "Isuzu FVR Series": [
        "FVR34Q Smoother",
        "FVR 34Q 6W 24ft 7.8L w/ ABS"
      ],
      "Isuzu FTS Series": [
        "FTS34 J",
        "FTS34L"
      ],
      "Isuzu FVM Series": [
        "FVM34T 10W 26ft 7.8L w/ ABS",
        "FVM34W 10W 32ft 7.8L w/ ABS"
      ],
      "Isuzu FXM Series": [
        "FXM60W"
      ],
      "Isuzu GXZ Series": [
        "GXZ60N"
      ],
      "Isuzu EXR Series": [
        "EXR77H 380PS 6W Tractor Head"
      ]
    };

    const existingCount = await VehicleModel.countDocuments();
    
    if (existingCount === 0) {
      const vehicleModels = [];
      
      for (const [unitName, variations] of Object.entries(defaultModels)) {
        let category = 'Commercial';
        
        if (unitName.includes('D-Max')) category = 'Pickup';
        else if (unitName.includes('MU-X')) category = 'SUV';
        else if (unitName.includes('FVR') || unitName.includes('FVM') || unitName.includes('FXM') || unitName.includes('GXZ') || unitName.includes('EXR')) category = 'Heavy Duty';
        else if (unitName.includes('NLR') || unitName.includes('NMR') || unitName.includes('NPR') || unitName.includes('NPS') || unitName.includes('NQR') || unitName.includes('FRR') || unitName.includes('FTR') || unitName.includes('FTS')) category = 'Truck';
        
        vehicleModels.push({
          unitName,
          variations,
          category,
          createdBy: 'System',
          updatedBy: 'System'
        });
      }
      
      await VehicleModel.insertMany(vehicleModels);
      
      await logAudit({
        action: 'initialize',
        resource: 'VehicleModels',
        performedBy: req.session?.user?.accountName || 'System',
        details: { message: `Initialized ${vehicleModels.length} vehicle models` }
      });
      
      res.json({
        success: true,
        message: `Successfully initialized ${vehicleModels.length} vehicle models`,
        data: vehicleModels
      });
    } else {
      res.json({
        success: true,
        message: `Vehicle models already initialized (${existingCount} models found)`,
        data: await VehicleModel.find({}).select('unitName variations category')
      });
    }
  } catch (error) {
    console.error('Error initializing vehicle models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize vehicle models',
      error: error.message
    });
  }
};

// Get all vehicle models
const getAllVehicleModels = async (req, res) => {
  try {
    const models = await VehicleModel.find({ isActive: true })
      .select('unitName variations category')
      .sort({ unitName: 1 });
    
    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error('Error fetching vehicle models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle models',
      error: error.message
    });
  }
};

// Get unit names only
const getUnitNames = async (req, res) => {
  try {
    const units = await VehicleModel.getActiveUnits();
    const unitNames = units.map(unit => unit.unitName);
    
    res.json({
      success: true,
      data: unitNames
    });
  } catch (error) {
    console.error('Error fetching unit names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit names',
      error: error.message
    });
  }
};

// Get variations for a specific unit
const getVariationsForUnit = async (req, res) => {
  try {
    const { unitName } = req.params;
    
    if (!unitName) {
      return res.status(400).json({
        success: false,
        message: 'Unit name is required'
      });
    }
    
    const variations = await VehicleModel.getVariationsForUnit(unitName);
    
    res.json({
      success: true,
      data: variations
    });
  } catch (error) {
    console.error('Error fetching variations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variations',
      error: error.message
    });
  }
};

// Validate unit-variation pair
const validateUnitVariationPair = async (req, res) => {
  try {
    const { unitName, variation } = req.body;
    
    if (!unitName || !variation) {
      return res.status(400).json({
        success: false,
        message: 'Both unitName and variation are required'
      });
    }
    
    const isValid = await VehicleModel.isValidPair(unitName, variation);
    
    res.json({
      success: true,
      data: {
        unitName,
        variation,
        isValid
      }
    });
  } catch (error) {
    console.error('Error validating pair:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate unit-variation pair',
      error: error.message
    });
  }
};

// Create new vehicle model
const createVehicleModel = async (req, res) => {
  try {
    const { unitName, variations, category } = req.body;
    
    if (!unitName || !variations || !Array.isArray(variations)) {
      return res.status(400).json({
        success: false,
        message: 'Unit name and variations array are required'
      });
    }
    
    const existingModel = await VehicleModel.findOne({ unitName });
    if (existingModel) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle model with this unit name already exists'
      });
    }
    
    const newModel = new VehicleModel({
      unitName,
      variations,
      category: category || 'Commercial',
      createdBy: req.session?.user?.accountName || 'Admin',
      updatedBy: req.session?.user?.accountName || 'Admin'
    });
    
    const savedModel = await newModel.save();
    
    await logAudit({
      action: 'create',
      resource: 'VehicleModel',
      resourceId: savedModel._id,
      performedBy: req.session?.user?.accountName || 'Admin',
      details: { newModel: savedModel }
    });
    
    res.json({
      success: true,
      message: 'Vehicle model created successfully',
      data: savedModel
    });
  } catch (error) {
    console.error('Error creating vehicle model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle model',
      error: error.message
    });
  }
};

// Update vehicle model
const updateVehicleModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { unitName, variations, category, isActive } = req.body;
    
    const existingModel = await VehicleModel.findById(id);
    if (!existingModel) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }
    
    const updateData = {
      updatedBy: req.session?.user?.accountName || 'Admin'
    };
    
    if (unitName !== undefined) updateData.unitName = unitName;
    if (variations !== undefined) updateData.variations = variations;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedModel = await VehicleModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    await logAudit({
      action: 'update',
      resource: 'VehicleModel',
      resourceId: id,
      performedBy: req.session?.user?.accountName || 'Admin',
      details: { 
        before: existingModel,
        after: updatedModel 
      }
    });
    
    res.json({
      success: true,
      message: 'Vehicle model updated successfully',
      data: updatedModel
    });
  } catch (error) {
    console.error('Error updating vehicle model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle model',
      error: error.message
    });
  }
};

// Delete vehicle model
const deleteVehicleModel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingModel = await VehicleModel.findById(id);
    if (!existingModel) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }
    
    // Soft delete - set isActive to false
    const deletedModel = await VehicleModel.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        updatedBy: req.session?.user?.accountName || 'Admin'
      },
      { new: true }
    );
    
    await logAudit({
      action: 'delete',
      resource: 'VehicleModel',
      resourceId: id,
      performedBy: req.session?.user?.accountName || 'Admin',
      details: { deletedModel }
    });
    
    res.json({
      success: true,
      message: 'Vehicle model deleted successfully',
      data: deletedModel
    });
  } catch (error) {
    console.error('Error deleting vehicle model:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle model',
      error: error.message
    });
  }
};

// Add variation to existing model
const addVariationToModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { variation } = req.body;
    
    if (!variation) {
      return res.status(400).json({
        success: false,
        message: 'Variation is required'
      });
    }
    
    const model = await VehicleModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }
    
    if (model.variations.includes(variation)) {
      return res.status(400).json({
        success: false,
        message: 'Variation already exists for this model'
      });
    }
    
    await model.addVariation(variation);
    model.updatedBy = req.session?.user?.accountName || 'Admin';
    await model.save();
    
    await logAudit({
      action: 'update',
      resource: 'VehicleModel',
      resourceId: id,
      performedBy: req.session?.user?.accountName || 'Admin',
      details: { 
        message: `Added variation: ${variation}`,
        variation 
      }
    });
    
    res.json({
      success: true,
      message: 'Variation added successfully',
      data: model
    });
  } catch (error) {
    console.error('Error adding variation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add variation',
      error: error.message
    });
  }
};

// Remove variation from existing model
const removeVariationFromModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { variation } = req.body;
    
    if (!variation) {
      return res.status(400).json({
        success: false,
        message: 'Variation is required'
      });
    }
    
    const model = await VehicleModel.findById(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle model not found'
      });
    }
    
    if (!model.variations.includes(variation)) {
      return res.status(400).json({
        success: false,
        message: 'Variation does not exist for this model'
      });
    }
    
    await model.removeVariation(variation);
    model.updatedBy = req.session?.user?.accountName || 'Admin';
    await model.save();
    
    await logAudit({
      action: 'update',
      resource: 'VehicleModel',
      resourceId: id,
      performedBy: req.session?.user?.accountName || 'Admin',
      details: { 
        message: `Removed variation: ${variation}`,
        variation 
      }
    });
    
    res.json({
      success: true,
      message: 'Variation removed successfully',
      data: model
    });
  } catch (error) {
    console.error('Error removing variation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove variation',
      error: error.message
    });
  }
};

module.exports = {
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
};