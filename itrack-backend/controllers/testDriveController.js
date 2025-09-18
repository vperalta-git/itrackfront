const TestDrive = require('../models/TestDrive');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

const testDriveController = {
  // Get all test drive requests (Admin/Supervisor view)
  getAllTestDrives: async (req, res) => {
    try {
      const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;
      
      const testDrives = await TestDrive.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
        
      const total = await TestDrive.countDocuments(query);
      
      res.json({
        success: true,
        data: testDrives,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching all test drives:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get test drives for specific agent
  getAgentTestDrives: async (req, res) => {
    try {
      const { agentId } = req.params;
      const { status, limit = 50 } = req.query;
      
      const query = { agentId };
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const testDrives = await TestDrive.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();
        
      res.json({ success: true, data: testDrives });
    } catch (error) {
      console.error('Error fetching agent test drives:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get single test drive details
  getTestDriveById: async (req, res) => {
    try {
      const { id } = req.params;
      const testDrive = await TestDrive.findById(id).lean();
      
      if (!testDrive) {
        return res.status(404).json({ success: false, message: 'Test drive not found' });
      }
      
      res.json({ success: true, data: testDrive });
    } catch (error) {
      console.error('Error fetching test drive:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Create new test drive request (Agent)
  createTestDriveRequest: async (req, res) => {
    try {
      const {
        agentName,
        agentId,
        customerName,
        customerPhone,
        customerEmail,
        customerLicense,
        customerAddress,
        requestedVehicle,
        alternativeVehicles,
        preferredDate,
        preferredTime,
        duration,
        specialRequirements,
        notes
      } = req.body;

      // Validation
      if (!agentName || !agentId || !customerName || !customerPhone || !customerLicense || !requestedVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: agentName, agentId, customerName, customerPhone, customerLicense, requestedVehicle'
        });
      }

      // Check if vehicle exists and is available
      const vehicle = await Vehicle.findOne({ unitId: requestedVehicle.unitId });
      if (!vehicle) {
        return res.status(400).json({
          success: false,
          message: 'Requested vehicle not found'
        });
      }

      const testDriveData = {
        agentName,
        agentId,
        customerName,
        customerPhone,
        customerEmail,
        customerLicense,
        customerAddress,
        requestedVehicle,
        alternativeVehicles: alternativeVehicles || [],
        preferredDate: new Date(preferredDate),
        preferredTime,
        duration: duration || 30,
        specialRequirements: specialRequirements || [],
        status: 'pending'
      };

      const testDrive = new TestDrive(testDriveData);
      const savedTestDrive = await testDrive.save();

      res.status(201).json({
        success: true,
        data: savedTestDrive,
        message: `Test drive request created successfully! Request ID: ${savedTestDrive.requestId}`
      });
    } catch (error) {
      console.error('Error creating test drive request:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update test drive status (Admin/Supervisor)
  updateTestDriveStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        reviewedBy,
        approvalNotes,
        rejectionReason,
        scheduledDate,
        scheduledTime,
        scheduledVehicle,
        scheduledDuration
      } = req.body;

      const testDrive = await TestDrive.findById(id);
      if (!testDrive) {
        return res.status(404).json({ success: false, message: 'Test drive not found' });
      }

      const updateData = {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date()
      };

      // Handle different status updates
      if (status === 'approved' || status === 'scheduled') {
        updateData.approvalNotes = approvalNotes;
        if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
        if (scheduledTime) updateData.scheduledTime = scheduledTime;
        if (scheduledVehicle) updateData.scheduledVehicle = scheduledVehicle;
        if (scheduledDuration) updateData.scheduledDuration = scheduledDuration;
      }

      if (status === 'rejected') {
        updateData.rejectionReason = rejectionReason;
      }

      if (status === 'in-progress') {
        updateData.startedAt = new Date();
      }

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      // Update the test drive
      Object.assign(testDrive, updateData);

      // Add history entry
      await testDrive.addHistory(
        `Status changed to ${status}`,
        reviewedBy,
        approvalNotes || rejectionReason || `Test drive ${status}`,
        { from: testDrive.status, to: status }
      );

      res.json({
        success: true,
        data: testDrive,
        message: `Test drive ${status} successfully`
      });
    } catch (error) {
      console.error('Error updating test drive status:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get available vehicles for test drive
  getAvailableVehicles: async (req, res) => {
    try {
      const { type, date } = req.query;
      
      const query = {
        status: { $in: ['Available', 'Ready'] },
        isActive: true
      };

      // Filter by vehicle type if specified
      if (type && type !== 'all') {
        query.type = type;
      }

      // Get vehicles that aren't scheduled for test drive on the specified date
      if (date) {
        const requestedDate = new Date(date);
        const scheduledVehicles = await TestDrive.find({
          scheduledDate: {
            $gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
            $lt: new Date(requestedDate.setHours(23, 59, 59, 999))
          },
          status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
        }).distinct('scheduledVehicle.unitId');

        if (scheduledVehicles.length > 0) {
          query.unitId = { $nin: scheduledVehicles };
        }
      }

      const vehicles = await Vehicle.find(query)
        .select('unitId model type brand year color status features specifications')
        .sort({ unitId: 1 })
        .lean();

      res.json({ success: true, data: vehicles });
    } catch (error) {
      console.error('Error fetching available vehicles:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Complete test drive with feedback
  completeTestDrive: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        conductedBy,
        feedback,
        postTestDriveCheck,
        leadStatus,
        followUpRequired,
        followUpDate,
        followUpNotes
      } = req.body;

      const testDrive = await TestDrive.findById(id);
      if (!testDrive) {
        return res.status(404).json({ success: false, message: 'Test drive not found' });
      }

      const updateData = {
        status: 'completed',
        completedAt: new Date(),
        conductedBy,
        feedback,
        postTestDriveCheck,
        leadStatus: leadStatus || 'warm',
        updatedAt: new Date()
      };

      if (followUpRequired) {
        updateData.followUpDate = followUpDate ? new Date(followUpDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        updateData.followUpNotes = followUpNotes;
      }

      Object.assign(testDrive, updateData);

      await testDrive.addHistory(
        'Test Drive Completed',
        conductedBy,
        `Completed with rating: ${feedback?.rating || 'N/A'}. Customer interested: ${feedback?.interestedInPurchase ? 'Yes' : 'No'}`
      );

      res.json({
        success: true,
        data: testDrive,
        message: 'Test drive marked as completed'
      });
    } catch (error) {
      console.error('Error completing test drive:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Cancel test drive
  cancelTestDrive: async (req, res) => {
    try {
      const { id } = req.params;
      const { cancelledBy, reason } = req.body;

      const testDrive = await TestDrive.findById(id);
      if (!testDrive) {
        return res.status(404).json({ success: false, message: 'Test drive not found' });
      }

      testDrive.status = 'cancelled';
      testDrive.updatedAt = new Date();

      await testDrive.addHistory(
        'Test Drive Cancelled',
        cancelledBy,
        reason || 'Test drive cancelled'
      );

      res.json({
        success: true,
        data: testDrive,
        message: 'Test drive cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling test drive:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = {
        // Total counts
        total: await TestDrive.countDocuments(),
        pending: await TestDrive.countDocuments({ status: 'pending' }),
        approved: await TestDrive.countDocuments({ status: { $in: ['approved', 'scheduled'] } }),
        completed: await TestDrive.countDocuments({ status: 'completed' }),
        
        // Today's test drives
        todayScheduled: await TestDrive.countDocuments({
          scheduledDate: { $gte: today, $lt: tomorrow },
          status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
        }),
        
        // This week's stats
        thisWeekCompleted: await TestDrive.countDocuments({
          completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: 'completed'
        }),
        
        // Conversion rate (completed with interest)
        interestedCustomers: await TestDrive.countDocuments({
          'feedback.interestedInPurchase': true,
          status: 'completed'
        })
      };

      // Calculate conversion rate
      stats.conversionRate = stats.completed > 0 ? 
        Math.round((stats.interestedCustomers / stats.completed) * 100) : 0;

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Get upcoming test drives for today/week
  getUpcomingTestDrives: async (req, res) => {
    try {
      const { period = 'today' } = req.query;
      const now = new Date();
      
      let startDate, endDate;
      
      if (period === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (period === 'week') {
        startDate = new Date();
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      const testDrives = await TestDrive.find({
        scheduledDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .lean();

      res.json({ success: true, data: testDrives });
    } catch (error) {
      console.error('Error fetching upcoming test drives:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Search test drives
  searchTestDrives: async (req, res) => {
    try {
      const { query, searchBy = 'all' } = req.query;
      
      if (!query) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
      }

      const searchQuery = {};
      const searchTerm = { $regex: query, $options: 'i' };

      if (searchBy === 'customer') {
        searchQuery.$or = [
          { customerName: searchTerm },
          { customerPhone: searchTerm },
          { customerEmail: searchTerm }
        ];
      } else if (searchBy === 'vehicle') {
        searchQuery.$or = [
          { 'requestedVehicle.unitId': searchTerm },
          { 'requestedVehicle.model': searchTerm }
        ];
      } else if (searchBy === 'requestId') {
        searchQuery.requestId = searchTerm;
      } else {
        // Search all fields
        searchQuery.$or = [
          { requestId: searchTerm },
          { customerName: searchTerm },
          { customerPhone: searchTerm },
          { customerEmail: searchTerm },
          { 'requestedVehicle.unitId': searchTerm },
          { 'requestedVehicle.model': searchTerm },
          { agentName: searchTerm }
        ];
      }

      const testDrives = await TestDrive.find(searchQuery)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      res.json({ success: true, data: testDrives });
    } catch (error) {
      console.error('Error searching test drives:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = testDriveController;