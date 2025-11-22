# Vehicle Status System Implementation

## Overview

Implemented a comprehensive workflow-based vehicle status system with 6 distinct statuses and automated status transitions based on business logic.

## Status Definitions

### 1. In Stockyard (Default)

- **Purpose**: Initial status when vehicle first arrives
- **Transitions To**: Available
- **Set By**: Default on vehicle creation, or manual update
- **Description**: Vehicle is in the stockyard, not yet ready for allocation

### 2. Available

- **Purpose**: Vehicle is ready for allocation
- **Transitions To**: In Stockyard, Pending
- **Set By**: Manual update, or automatic when driver delivers to Isuzu Pasig
- **Description**: Vehicle at Isuzu Pasig dealership, ready to be assigned

### 3. Pending

- **Purpose**: Vehicle has been allocated to driver/agent but not yet in transit
- **Transitions To**: Available, In Transit
- **Set By**: Automatic when allocation is created
- **Description**: Waiting for driver to accept and begin transport

### 4. In Transit

- **Purpose**: Vehicle is being transported by driver
- **Transitions To**: Available
- **Set By**: Automatic when driver accepts allocation
- **Description**: Driver is actively transporting vehicle to Isuzu Pasig

### 5. Preparing

- **Purpose**: Vehicle is undergoing dispatch processes
- **Transitions To**: Released
- **Set By**: Automatic when assigned to dispatch
- **Description**: Vehicle undergoing final preparation (tinting, carwash, accessories, etc.)

### 6. Released

- **Purpose**: Vehicle has been released to customer
- **Transitions To**: None (final state)
- **Set By**: Automatic via Release button only
- **Description**: Vehicle has been delivered to customer and transaction is complete

## Status Transition Rules

```
In Stockyard → Available
Available → In Stockyard, Pending
Pending → Available, In Transit
In Transit → Available
Preparing → Released
Released → [FINAL STATE]
```

## Implementation Details

### Frontend Changes

#### 1. VehicleModels.js (constants/VehicleModels.js)

```javascript
// Added status options array
export const VEHICLE_STATUS_OPTIONS = [
  "In Stockyard",
  "Available",
  "Pending",
  "In Transit",
  "Preparing",
  "Released",
];

// Added status rules with descriptions and allowed transitions
export const VEHICLE_STATUS_RULES = {
  "In Stockyard": {
    description: "Vehicle in stockyard, not yet at dealership",
    canTransitionTo: ["Available"],
    defaultForNewVehicle: true,
  },
  Available: {
    description: "Vehicle at Isuzu Pasig, ready for allocation",
    canTransitionTo: ["In Stockyard", "Pending"],
  },
  // ... (rest of rules)
};

// Helper functions
export const getAddVehicleStatusOptions = () => {
  // Returns only ['In Stockyard', 'Available'] for new vehicles
};

export const getAllowedStatusTransitions = (currentStatus, context = {}) => {
  // Returns allowed transitions based on current status and context
};

export const isValidStatusTransition = (
  currentStatus,
  newStatus,
  context = {}
) => {
  // Validates if a status transition is allowed
};
```

#### 2. EnhancedVehicleForm.js (components/EnhancedVehicleForm.js)

- **Default Status**: Changed from 'Available' to 'In Stockyard'
- **Status Picker**: Uses `getAddVehicleStatusOptions()` for new vehicles (limits to In Stockyard/Available)
- **Validation**: Added status validation in `validateForm()` to enforce rules
- **Hint Text**: Added guidance text for status selection on new vehicles
- **Style**: Added `hintText` style for user guidance display

### Backend Changes

#### 1. Add Inventory Endpoint (POST /addToInventory)

```javascript
// Validates status for new vehicles
const validAddStatuses = ["In Stockyard", "Available"];
const finalStatus =
  status && validAddStatuses.includes(status) ? status : "In Stockyard";

// Rejects invalid status attempts
if (status && !validAddStatuses.includes(status)) {
  return res.status(400).json({
    success: false,
    message:
      'Invalid status for new vehicle. Only "In Stockyard" or "Available" are allowed.',
  });
}
```

#### 2. Update Inventory Endpoint (PUT /updateInventoryItem/:id)

```javascript
// Validates status transitions before update
const validTransitions = {
  "In Stockyard": ["Available"],
  Available: ["In Stockyard", "Pending"],
  Pending: ["Available", "In Transit"],
  "In Transit": ["Available"],
  Preparing: ["Released"],
  Released: [],
};

// Prevents manual "Released" status
if (newStatus === "Released") {
  return res.status(400).json({
    success: false,
    message:
      'Status "Released" cannot be set manually. Use the Release button action.',
  });
}

// Validates transition is allowed
const allowedTransitions = validTransitions[currentStatus] || [];
if (!allowedTransitions.includes(newStatus)) {
  return res.status(400).json({
    success: false,
    message: `Invalid status transition from "${currentStatus}" to "${newStatus}"`,
  });
}
```

#### 3. Create Allocation Endpoint (POST /createAllocation)

- **Automatic Status Update**: Sets vehicle status to "Pending" when allocation is created
- **Updated Fields**: `status`, `lastUpdatedBy`, `dateUpdated`

#### 4. Update Driver Allocation Endpoint (PATCH /driver-allocations/:id)

- **In Transit**: Sets vehicle status to "In Transit" when allocation status changes to "In Transit"
- **Delivered/Completed**: Sets vehicle status to "Available" when driver completes delivery
- **Tracking**: Logs all automatic status updates

#### 5. Create Dispatch Assignment Endpoint (POST /api/dispatch/assignments)

- **Automatic Status Update**: Sets vehicle status to "Preparing" when assigned to dispatch
- **Process Tracking**: Initializes process status for dispatch checklist

#### 6. Release Vehicle Endpoint (POST /api/releases)

- **Automatic Status Update**: Sets vehicle status to "Released" when Release button is clicked
- **Final State**: This is the only way to set "Released" status
- **Tracking**: Records releasedBy and releasedAt timestamp

#### 7. Delete Allocation Endpoint (DELETE /deleteAllocation/:id)

- **Status Restoration**: Returns vehicle to "Available" status when allocation is deleted
- **Cleanup**: Ensures vehicle can be reallocated after deletion

## Workflow Examples

### Example 1: New Vehicle Entry to Customer Release

1. **Add Vehicle** → Status: "In Stockyard" (default)
2. **Manual Update** → Status: "Available" (vehicle arrives at Isuzu Pasig)
3. **Assign to Driver** → Status: "Pending" (automatic via createAllocation)
4. **Driver Accepts** → Status: "In Transit" (automatic via driver allocation update)
5. **Driver Delivers** → Status: "Available" (automatic when driver completes)
6. **Assign to Dispatch** → Status: "Preparing" (automatic via dispatch assignment)
7. **Complete Processes** → Status remains "Preparing"
8. **Release to Customer** → Status: "Released" (automatic via Release button)

### Example 2: Vehicle Already at Isuzu Pasig

1. **Add Vehicle** → Status: "Available" (selected during creation)
2. **Assign to Dispatch** → Status: "Preparing" (skip allocation workflow)
3. **Release to Customer** → Status: "Released"

### Example 3: Allocation Cancellation

1. Vehicle Status: "Pending" (allocated to driver)
2. **Delete Allocation** → Status: "Available" (automatic restoration)
3. Vehicle ready for new allocation

## Validation Rules

### Add Vehicle

- ✅ Allowed: "In Stockyard" (default), "Available"
- ❌ Blocked: "Pending", "In Transit", "Preparing", "Released"

### Manual Status Update

- ✅ Allowed: Transitions defined in VEHICLE_STATUS_RULES
- ❌ Blocked: "Released" (only via Release button)
- ❌ Blocked: Invalid transitions (e.g., "In Stockyard" → "In Transit")

### Automatic Status Updates

- **Create Allocation**: Any status → "Pending"
- **Driver Accepts**: "Pending" → "In Transit"
- **Driver Delivers**: "In Transit" → "Available"
- **Assign to Dispatch**: "Available" → "Preparing"
- **Release Vehicle**: "Preparing" → "Released"
- **Delete Allocation**: Any status → "Available"

## Database Schema Changes

### Inventory Collection

```javascript
{
  // ... existing fields
  status: String,           // One of the 6 status values
  lastUpdatedBy: String,    // Tracks who/what updated status
  dateUpdated: Date         // When status was last updated
}
```

No schema migration needed - existing fields are used.

## Testing Checklist

### Frontend Testing

- [ ] Add new vehicle with default "In Stockyard" status
- [ ] Add new vehicle with "Available" status
- [ ] Verify hint text displays for new vehicles
- [ ] Attempt to add vehicle with invalid status (should fail)
- [ ] Update vehicle status with valid transitions
- [ ] Attempt invalid status transitions (should show error)
- [ ] Verify status picker shows correct options for new vs. existing vehicles

### Backend Testing

- [ ] POST /addToInventory with no status → defaults to "In Stockyard"
- [ ] POST /addToInventory with "Available" status → succeeds
- [ ] POST /addToInventory with "Pending" status → fails with 400
- [ ] PUT /updateInventoryItem with valid transition → succeeds
- [ ] PUT /updateInventoryItem with invalid transition → fails with 400
- [ ] PUT /updateInventoryItem with "Released" → fails with 400
- [ ] POST /createAllocation → vehicle status changes to "Pending"
- [ ] PATCH /driver-allocations with "In Transit" → vehicle status updates
- [ ] PATCH /driver-allocations with "Completed" → vehicle status returns to "Available"
- [ ] POST /api/dispatch/assignments → vehicle status changes to "Preparing"
- [ ] POST /api/releases → vehicle status changes to "Released"
- [ ] DELETE /deleteAllocation → vehicle status returns to "Available"

### Workflow Testing

- [ ] Complete full workflow from "In Stockyard" to "Released"
- [ ] Test allocation cancellation and status restoration
- [ ] Verify automatic status updates at each stage
- [ ] Test edge cases (delete allocation while "In Transit", etc.)

## Migration Notes

### For Existing Data

- Existing vehicles with invalid statuses should be manually reviewed
- Recommended approach:
  1. Query all vehicles with status not in VEHICLE_STATUS_OPTIONS
  2. Update based on business context:
     - Unallocated vehicles → "Available"
     - Vehicles with active allocations → "Pending" or "In Transit"
     - Vehicles in dispatch → "Preparing"
     - Completed vehicles → "Released"

### Deployment Steps

1. Deploy backend changes (server.js)
2. Test API endpoints with sample data
3. Deploy frontend changes (VehicleModels.js, EnhancedVehicleForm.js)
4. Test complete workflow end-to-end
5. Monitor logs for automatic status updates
6. Review and clean up existing data if needed

## Rollback Plan

If issues are discovered:

1. Backend: Revert server.js to previous version (removes validation)
2. Frontend: Keep changes (backward compatible - just loosens restrictions)
3. Data: No cleanup needed - status field remains unchanged

## Future Enhancements

### Potential Additions

1. **Status History**: Track all status changes with timestamps
2. **Status Notifications**: Alert users when status changes
3. **Status Filters**: Advanced filtering by status in inventory screen
4. **Status Reports**: Analytics dashboard showing vehicle status distribution
5. **Status Colors**: Visual color coding for each status
6. **Status Permissions**: Role-based restrictions on status changes

### Code Locations for Future Work

- Status history tracking: Add to Inventory schema and update endpoints
- Notifications: Integrate with existing notification system
- Filters: Update InventoryScreen.js search/filter logic
- Reports: Add to AdminDashboard.js analytics
- Colors: Add to VehicleModels.js and apply in UI components
- Permissions: Add checks in server.js endpoints

## Support and Maintenance

### Common Issues

1. **Status stuck in "Pending"**: Check if allocation was deleted properly
2. **Cannot update status**: Verify current status and allowed transitions
3. **Vehicle shows wrong status**: Check automatic update logs in backend
4. **"Released" cannot be set**: Reminder this is intentional - use Release button

### Logging

All automatic status updates are logged with format:

```
✅ Updated vehicle [unitId] status to "[newStatus]"
```

Search logs for vehicle's unitId to track status history.

## Documentation

- Frontend constants: `constants/VehicleModels.js`
- Frontend form: `components/EnhancedVehicleForm.js`
- Backend validation: `itrack-backend/server.js` (lines 3359-3632)
- Status transitions documented in this file

---

**Implementation Date**: 2025-06-XX  
**Implemented By**: Development Team  
**Status**: ✅ Complete - Ready for Testing
