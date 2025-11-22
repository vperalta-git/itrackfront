const TestDriveBooking = require('../models/TestDriveBooking');
const User = require('../models/User');
const mongoose = require('mongoose');

// 📝 CREATE - Book a new test drive
const createBooking = async (req, res) => {
  try {
    console.log('📝 Creating new test drive booking:', req.body);

    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerLicenseNumber,
      customerAge,
      vehicleModel,
      vehicleType,
      vehicleColor,
      vehicleYear,
      vehiclePlateNumber,
      vehicleVIN,
      bookingDate,
      bookingTime,
      duration,
      testDriveRoute,
      specialRequests,
      customerNotes,
      pickupLocation,
      customPickupAddress,
      createdBy
    } = req.body;

    // Validate required fields
    if (!customerName || !customerPhone || !customerEmail || !customerLicenseNumber || 
        !customerAge || !vehicleModel || !vehicleType || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if the booking time slot is available
    const selectedDate = new Date(bookingDate);
    const availableSlots = await TestDriveBooking.findAvailableSlots(selectedDate, duration || 60);
    
    if (!availableSlots.includes(bookingTime)) {
      return res.status(409).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    // Create new booking
    const newBooking = new TestDriveBooking({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerAddress: customerAddress?.trim(),
      customerLicenseNumber: customerLicenseNumber.trim().toUpperCase(),
      customerAge: parseInt(customerAge),
      vehicleModel: vehicleModel.trim(),
      vehicleType,
      vehicleColor: vehicleColor?.trim(),
      vehicleYear: vehicleYear ? parseInt(vehicleYear) : undefined,
      vehiclePlateNumber: vehiclePlateNumber?.trim().toUpperCase(),
      vehicleVIN: vehicleVIN?.trim().toUpperCase(),
      bookingDate: selectedDate,
      bookingTime,
      duration: duration || 60,
      testDriveRoute: testDriveRoute || 'City Route',
      specialRequests: specialRequests?.trim(),
      customerNotes: customerNotes?.trim(),
      pickupLocation: pickupLocation || 'Dealership',
      customPickupAddress: customPickupAddress?.trim(),
      createdBy: createdBy || req.user?.id,
      status: 'Pending'
    });

    const savedBooking = await newBooking.save();
    await savedBooking.populate([
      { path: 'createdBy', select: 'username accountName role' },
      { path: 'assignedSalesAgent', select: 'username accountName' },
      { path: 'assignedDriver', select: 'username accountName' }
    ]);

    console.log('✅ Test drive booking created:', savedBooking.bookingReference);

    res.status(201).json({
      success: true,
      message: 'Test drive booking created successfully',
      data: savedBooking
    });

  } catch (error) {
    console.error('❌ Error creating test drive booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test drive booking',
      error: error.message
    });
  }
};

// 📋 READ - Get all bookings with filters and pagination
const getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      vehicleType,
      assignedSalesAgent,
      dateFrom,
      dateTo,
      customerPhone,
      customerEmail,
      bookingReference,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query filter
    const filter = {};
    
    if (status) filter.status = status;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (assignedSalesAgent) filter.assignedSalesAgent = assignedSalesAgent;
    if (customerPhone) filter.customerPhone = new RegExp(customerPhone, 'i');
    if (customerEmail) filter.customerEmail = new RegExp(customerEmail, 'i');
    if (bookingReference) filter.bookingReference = new RegExp(bookingReference, 'i');
    
    if (dateFrom || dateTo) {
      filter.bookingDate = {};
      if (dateFrom) filter.bookingDate.$gte = new Date(dateFrom);
      if (dateTo) filter.bookingDate.$lte = new Date(dateTo);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bookings = await TestDriveBooking.find(filter)
      .populate([
        { path: 'createdBy', select: 'username accountName role' },
        { path: 'assignedSalesAgent', select: 'username accountName' },
        { path: 'assignedDriver', select: 'username accountName' },
        { path: 'updatedBy', select: 'username accountName' }
      ])
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await TestDriveBooking.countDocuments(filter);

    console.log(`📋 Retrieved ${bookings.length} test drive bookings (${total} total)`);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasMore: skip + bookings.length < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching test drive bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test drive bookings',
      error: error.message
    });
  }
};

// 🔍 READ - Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await TestDriveBooking.findById(id)
      .populate([
        { path: 'createdBy', select: 'username accountName role email' },
        { path: 'assignedSalesAgent', select: 'username accountName email phoneNumber' },
        { path: 'assignedDriver', select: 'username accountName email phoneNumber' },
        { path: 'updatedBy', select: 'username accountName' },
        { path: 'assignedBy', select: 'username accountName' }
      ]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Test drive booking not found'
      });
    }

    console.log(`🔍 Retrieved booking: ${booking.bookingReference}`);

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('❌ Error fetching booking by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
};

// ✏️ UPDATE - Update booking details
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await TestDriveBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Test drive booking not found'
      });
    }

    // Check if booking can be modified
    if (updates.bookingDate || updates.bookingTime) {
      if (!booking.canBeModified()) {
        return res.status(400).json({
          success: false,
          message: 'Booking cannot be modified (less than 2 hours before scheduled time or not in modifiable status)'
        });
      }

      // Check availability for new time slot
      if (updates.bookingTime && updates.bookingDate) {
        const newDate = new Date(updates.bookingDate);
        const availableSlots = await TestDriveBooking.findAvailableSlots(newDate, booking.duration);
        
        if (!availableSlots.includes(updates.bookingTime)) {
          return res.status(409).json({
            success: false,
            message: 'New time slot is not available'
          });
        }
      }
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && updates[key] !== null) {
        booking[key] = updates[key];
      }
    });

    // Set updatedBy if provided
    if (req.user?.id) {
      booking.updatedBy = req.user.id;
    }

    const updatedBooking = await booking.save();
    await updatedBooking.populate([
      { path: 'createdBy', select: 'username accountName role' },
      { path: 'assignedSalesAgent', select: 'username accountName' },
      { path: 'assignedDriver', select: 'username accountName' },
      { path: 'updatedBy', select: 'username accountName' }
    ]);

    console.log(`✏️ Updated booking: ${updatedBooking.bookingReference}`);

    res.json({
      success: true,
      message: 'Test drive booking updated successfully',
      data: updatedBooking
    });

  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message
    });
  }
};

// 🗑️ DELETE - Cancel/Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await TestDriveBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Test drive booking not found'
      });
    }

    // Instead of deleting, mark as cancelled
    booking.status = 'Cancelled';
    booking.cancellationReason = reason || 'Cancelled by user';
    booking.cancelledAt = new Date();
    if (req.user?.id) {
      booking.updatedBy = req.user.id;
    }

    await booking.save();

    console.log(`🗑️ Cancelled booking: ${booking.bookingReference}`);

    res.json({
      success: true,
      message: 'Test drive booking cancelled successfully',
      data: booking
    });

  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// 📊 ANALYTICS - Get booking statistics
const getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'status' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get basic counts
    const totalBookings = await TestDriveBooking.countDocuments(dateFilter);
    const statusCounts = await TestDriveBooking.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const vehicleTypeCounts = await TestDriveBooking.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get recent bookings
    const recentBookings = await TestDriveBooking.find(dateFilter)
      .populate('assignedSalesAgent', 'username accountName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('bookingReference customerName vehicleModel status createdAt');

    // Calculate conversion rate
    const completedBookings = await TestDriveBooking.countDocuments({
      ...dateFilter,
      status: 'Completed'
    });

    const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0;

    console.log('📊 Generated booking statistics');

    res.json({
      success: true,
      data: {
        totalBookings,
        conversionRate: `${conversionRate}%`,
        statusBreakdown: statusCounts,
        vehicleTypeBreakdown: vehicleTypeCounts,
        recentBookings
      }
    });

  } catch (error) {
    console.error('❌ Error fetching booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics',
      error: error.message
    });
  }
};

// 🕐 UTILITY - Get available time slots for a date
const getAvailableSlots = async (req, res) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const selectedDate = new Date(date);
    if (selectedDate < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book for past dates'
      });
    }

    const availableSlots = await TestDriveBooking.findAvailableSlots(selectedDate, parseInt(duration));

    console.log(`🕐 Found ${availableSlots.length} available slots for ${date}`);

    res.json({
      success: true,
      data: {
        date,
        duration: parseInt(duration),
        availableSlots
      }
    });

  } catch (error) {
    console.error('❌ Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available time slots',
      error: error.message
    });
  }
};

// 👥 ASSIGNMENT - Assign staff to booking
const assignStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { salesAgentId, driverId, assignedBy } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    const booking = await TestDriveBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Test drive booking not found'
      });
    }

    // Verify staff members exist and have correct roles
    if (salesAgentId) {
      const salesAgent = await User.findById(salesAgentId);
      if (!salesAgent || salesAgent.role !== 'Sales Agent') {
        return res.status(400).json({
          success: false,
          message: 'Invalid sales agent ID'
        });
      }
      booking.assignedSalesAgent = salesAgentId;
    }

    if (driverId) {
      const driver = await User.findById(driverId);
      if (!driver || driver.role !== 'Driver') {
        return res.status(400).json({
          success: false,
          message: 'Invalid driver ID'
        });
      }
      booking.assignedDriver = driverId;
    }

    booking.assignedBy = assignedBy || req.user?.id;
    booking.updatedBy = req.user?.id;

    const updatedBooking = await booking.save();
    await updatedBooking.populate([
      { path: 'assignedSalesAgent', select: 'username accountName email' },
      { path: 'assignedDriver', select: 'username accountName email' },
      { path: 'assignedBy', select: 'username accountName' }
    ]);

    console.log(`👥 Staff assigned to booking: ${booking.bookingReference}`);

    res.json({
      success: true,
      message: 'Staff assigned successfully',
      data: updatedBooking
    });

  } catch (error) {
    console.error('❌ Error assigning staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning staff',
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getAvailableSlots,
  assignStaff
};