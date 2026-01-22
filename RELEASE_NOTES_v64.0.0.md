# I-Track Release Notes v64.0.0

**Release Date:** December 10, 2025
**Build Type:** Production Release

---

## 🎯 Major Features: Sales Agent Account System

### Overview

Complete implementation of Sales Agent role with view-only permissions and assigned-items filtering throughout the entire application.

---

## ✨ New Features

### 1. **Sales Agent Dashboard (Complete Redesign)**

- **NEW:** Complete dashboard matching Admin layout
- Shows 4 stat cards: Total Stocks, Finished Vehicle Preparation, Ongoing Shipment, Ongoing Vehicle Preparation
- Integrated Stocks Overview with pie chart
- Recent In Progress Vehicle Preparation table
- Recent Assigned Shipments table
- Recent Completed Requests table
- **All data filtered** to show only items assigned to the logged-in agent
- Pull-to-refresh functionality

### 2. **Agent Shipment Tracking (NEW Screen)**

- Dedicated screen for viewing assigned shipments
- Status badges: In Transit (Orange), Delivered (Green), Pending (Gray)
- Complete shipment details: pickup/destination, customer info, driver assignment
- View-only interface with no modification capabilities

### 3. **Role-Based Navigation**

- Sales Agents automatically route to AgentDashboard on login/refresh
- Dashboard navigation fixed - no longer shows Admin Dashboard first
- "Agent Allocation" menu item removed from Sales Agent sidebar
- "View Shipment" menu item added to Sales Agent sidebar

---

## 🔒 Security & Permissions

### View-Only Restrictions for Sales Agents

Sales Agents can **VIEW** but **CANNOT**:

- ❌ Add, edit, or delete inventory vehicles
- ❌ Create new service requests
- ❌ Add or delete test drive vehicles
- ❌ Schedule or delete test drives
- ❌ Modify any allocations or shipments
- ❌ Access Agent Allocation features (admin-only)

### Data Filtering

All screens filter data by `assignedAgent` field:

- **Dashboard:** Shows only assigned vehicles, shipments, and preps
- **Inventory:** View-only with hidden action buttons
- **Vehicle Preparation:** Shows only assigned vehicles, no "New Request" button
- **Test Drive:** View-only with all action buttons hidden
- **Shipment Tracking:** Shows only assigned deliveries

---

## 🛠️ Technical Improvements

### Modified Files

1. **UnifiedDrawer.js**

   - Fixed initial route based on user role
   - Updated menu filtering for Sales Agent
   - Added AgentShipmentTracking screen registration

2. **AgentDashboard.js**

   - Complete replacement with Admin-style UI
   - Added agentName state for filtering
   - Integrated data filtering by assignedAgent
   - Updated to match AdminDashboard layout exactly

3. **AgentShipmentTracking.js** (NEW)

   - 320 lines of new code
   - Complete shipment tracking interface
   - Status-based color coding
   - Comprehensive shipment details display

4. **InventoryScreen.js**

   - Added role checks for action buttons
   - Hidden "Add Vehicle" button for Sales Agents
   - Hidden Edit/Delete buttons for Sales Agents

5. **ServiceRequestScreen.js**

   - Added filtering by assignedAgent
   - Hidden "New Request" button for Sales Agents
   - Only shows vehicles assigned to the agent

6. **TestDriveScreen.js**
   - Replaced date/time text inputs with DateTimePicker
   - Added vehicle dropdown picker
   - Contact validation (exactly 11 digits)
   - Hidden all action buttons for Sales Agents

### API Integration

- `/getAllocation` - Filtered for agent's shipments
- `/getRequest` - Filtered for agent's service requests
- `/getUnits` - Filtered for agent's assigned vehicles
- `/getInventory` - Full view but read-only for agents
- `/api/getTestDriveInv` - Read-only for agents

---

## 🐛 Bug Fixes

1. **Fixed:** Dashboard routing issue - Sales Agents no longer see Admin Dashboard on refresh
2. **Fixed:** Navigation automatically routes to correct dashboard based on user role
3. **Fixed:** Duplicate agentName state declaration
4. **Fixed:** Agent Allocation appearing in Sales Agent menu
5. **Fixed:** Sales Agents able to modify inventory
6. **Fixed:** Sales Agents able to create service requests
7. **Fixed:** Test drive date/time inputs using text instead of pickers

---

## 📊 System Requirements

- **Android:** 6.0 (API 23) or higher
- **Storage:** Minimum 50 MB free space
- **Internet:** Required for all features
- **Permissions:**
  - Location (for maps and tracking)
  - Storage (for documents and images)
  - Camera (for photo uploads)
  - Network (for API communication)

---

## 🔄 Database Requirements

### Required Fields

All backend collections must have `assignedAgent` field:

- **Allocations Collection:** `assignedAgent` (String) - matches accountName
- **Service Requests Collection:** `assignedAgent` (String) - matches accountName
- **Unit Allocations Collection:** `assignedAgent` (String) - matches accountName

### User Authentication

- `userRole` stored in AsyncStorage (values: 'Admin', 'Manager', 'Sales Agent', 'Supervisor', 'Driver', 'Dispatch')
- `accountName` stored in AsyncStorage (used for filtering)

---

## 📝 Testing Checklist Completed

✅ Navigation Testing

- Login as Sales Agent routes to AgentDashboard
- "Agent Allocation" not visible in sidebar
- "View Shipment" visible in sidebar
- All dashboard cards navigate correctly

✅ Dashboard Testing

- Dashboard shows Admin-style UI
- Stats cards show only assigned items
- StocksOverview shows only assigned vehicles
- Pull-to-refresh works correctly

✅ Inventory Testing

- "Add Vehicle" button hidden for Sales Agents
- Edit/Delete buttons hidden for Sales Agents
- Can view all vehicles but cannot modify

✅ Service Request Testing

- Only assigned vehicles shown
- "New Request" button hidden
- Can view request details

✅ Shipment Tracking Testing

- Only assigned shipments shown
- Status badges display correctly
- All shipment details visible

✅ Test Drive Testing

- "Add" button hidden for Sales Agents
- "Schedule" button hidden
- Delete buttons hidden on all cards
- Date picker uses calendar
- Time picker uses clock
- Contact validation works (11 digits)

---

## 🚀 Deployment Instructions

### For End Users:

1. Download `app-release.apk` from shared drive
2. Enable "Install from Unknown Sources" in Android settings
3. Install the APK
4. Launch I-Track and login with your credentials

### For Developers:

```bash
# Build APK locally
cd "D:\Mobile App I-Track"
build-release-v64.bat

# APK output location:
# itrack\android\app\build\outputs\apk\release\app-release.apk
```

---

## 📦 Build Information

- **Version:** 64.0.0
- **Version Code:** 64
- **Package:** com.acmobility.itrack
- **Build Tool:** Gradle 8.x
- **React Native:** 0.74.5
- **Expo SDK:** 51.0.28
- **Bundle Type:** Release (Production)

---

## 🔗 Related Documentation

- [Agent Account Fixes Summary](./AGENT_ACCOUNT_FIXES_SUMMARY.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Installation Guide](./INSTALLATION_GUIDE_v52.md)

---

## 👥 Credits

**Development Team:** GitHub Copilot
**Project:** I-Track - Vehicle Management System
**Company:** AC Mobility

---

## 📞 Support

For issues or questions:

- Check existing documentation in the project
- Review error logs in the app
- Contact development team

---

**Note:** This is a major release with significant changes to the Sales Agent role. Please ensure all team members are informed of the new permissions and filtering system.
