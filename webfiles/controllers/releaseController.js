const DriverAllocation = require('../models/DriverAllocation');

// Get releases
exports.getReleases = async (req, res) => {
  try {
    // Get completed/released allocations
    const releases = await DriverAllocation.find({ 
      status: { $in: ['Completed', 'Released'] } 
    }).sort({ date: -1 });
    
    console.log(`📋 Retrieved ${releases.length} releases`);
    res.json({ 
      success: true, 
      data: releases,
      total: releases.length 
    });
  } catch (error) {
    console.error('❌ Get releases error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create release
exports.createRelease = async (req, res) => {
  try {
    const { allocationId, releaseNotes, releasedBy } = req.body;

    if (!allocationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Allocation ID is required' 
      });
    }

    // Update allocation status to Released
    const updatedAllocation = await DriverAllocation.findByIdAndUpdate(
      allocationId,
      {
        status: 'Released',
        releaseNotes: releaseNotes || '',
        releasedBy: releasedBy || 'System',
        releaseDate: new Date()
      },
      { new: true }
    );

    if (!updatedAllocation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Allocation not found' 
      });
    }

    console.log('✅ Created release for:', updatedAllocation.unitName);
    res.json({
      success: true,
      message: 'Release created successfully',
      data: updatedAllocation
    });
  } catch (error) {
    console.error('❌ Create release error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Confirm release
exports.confirmRelease = async (req, res) => {
  try {
    const { allocationId, confirmationNotes, confirmedBy } = req.body;

    if (!allocationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Allocation ID is required' 
      });
    }

    // Update allocation status to Confirmed
    const updatedAllocation = await DriverAllocation.findByIdAndUpdate(
      allocationId,
      {
        status: 'Confirmed',
        confirmationNotes: confirmationNotes || '',
        confirmedBy: confirmedBy || 'System',
        confirmationDate: new Date()
      },
      { new: true }
    );

    if (!updatedAllocation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Allocation not found' 
      });
    }

    console.log('✅ Confirmed release for:', updatedAllocation.unitName);
    res.json({
      success: true,
      message: 'Release confirmed successfully',
      data: updatedAllocation
    });
  } catch (error) {
    console.error('❌ Confirm release error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};