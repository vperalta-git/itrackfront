const Servicerequest = require('../models/Servicerequest');
const CompletedRequest = require('../models/CompletedRequest');

// Get all service requests
exports.getRequest = async (req, res) => {
  try {
    const requests = await Servicerequest.find().lean();
    console.log(`📋 Retrieved ${requests.length} service requests`);
    res.json(requests);
  } catch (error) {
    console.error('❌ Get requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new service request
exports.createRequest = async (req, res) => {
  try {
    const { 
      customerName, 
      vehicleModel, 
      serviceType, 
      description, 
      priority,
      estimatedCost,
      assignedTechnician 
    } = req.body;

    if (!customerName || !vehicleModel || !serviceType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name, vehicle model, and service type are required' 
      });
    }

    console.log(`📋 Creating service request: ${serviceType} for ${customerName}`);

    const newRequest = new Servicerequest({
      customerName,
      vehicleModel,
      serviceType,
      description: description || '',
      priority: priority || 'Normal',
      status: 'Pending',
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
      assignedTechnician: assignedTechnician || null,
      dateCreated: new Date(),
      lastUpdated: new Date()
    });

    await newRequest.save();
    
    console.log(`✅ Service request created: ${serviceType} (ID: ${newRequest._id})`);

    res.json({
      success: true,
      message: 'Service request created successfully',
      data: newRequest
    });
  } catch (error) {
    console.error('❌ Create request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create service request',
      error: error.message 
    });
  }
};

// Get completed requests
exports.getCompletedRequests = async (req, res) => {
  try {
    const completedRequests = await CompletedRequest.find().lean();
    console.log(`✅ Retrieved ${completedRequests.length} completed requests`);
    res.json(completedRequests);
  } catch (error) {
    console.error('❌ Get completed requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mark request as completed
exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalCost, completionNotes, completedBy } = req.body;

    // Find the original request
    const originalRequest = await Servicerequest.findById(id);
    if (!originalRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service request not found' 
      });
    }

    // Create completed request record
    const completedRequest = new CompletedRequest({
      originalRequestId: originalRequest._id,
      customerName: originalRequest.customerName,
      vehicleModel: originalRequest.vehicleModel,
      serviceType: originalRequest.serviceType,
      description: originalRequest.description,
      estimatedCost: originalRequest.estimatedCost,
      finalCost: finalCost ? parseFloat(finalCost) : originalRequest.estimatedCost,
      completionNotes: completionNotes || '',
      completedBy: completedBy || 'System',
      dateCreated: originalRequest.dateCreated,
      dateCompleted: new Date()
    });

    await completedRequest.save();

    // Remove from active requests
    await Servicerequest.findByIdAndDelete(id);
    
    console.log(`✅ Request completed: ${originalRequest.serviceType} for ${originalRequest.customerName}`);

    res.json({
      success: true,
      message: 'Service request marked as completed',
      data: completedRequest
    });
  } catch (error) {
    console.error('❌ Complete request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to complete service request',
      error: error.message 
    });
  }
};

// Update service request
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedRequest = await Servicerequest.findByIdAndUpdate(
      id, 
      { ...updates, lastUpdated: new Date() }, 
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service request not found' 
      });
    }

    console.log(`✅ Request updated: ${updatedRequest.serviceType}`);

    res.json({
      success: true,
      message: 'Service request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('❌ Update request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update service request',
      error: error.message 
    });
  }
};