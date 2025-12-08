# Driver Allocation Screen - Complete Guide

## Overview

The Driver Allocation screen is a comprehensive vehicle assignment and tracking system that allows administrators to allocate vehicles to drivers, manage customer information, and plan delivery routes with GPS tracking.

## Key Features

### 1. **Vehicle Assignment Modes**

- **From Stock**: Select vehicles from available inventory
- **Manual Entry**: Manually enter vehicle details for vehicles not in inventory

### 2. **Customer Management**

- Customer name (required)
- Customer email (required)
- Customer phone number (optional)
- Full customer information stored with each allocation

### 3. **Route Planning**

- **Interactive Map Selection**: Use the route planner to select pickup and drop-off locations on an interactive map
- **Distance Calculation**: Automatic calculation of route distance in kilometers
- **Time Estimation**: Estimated delivery time based on route
- **Quick Location Selection**: Preset locations for common routes (Isuzu Laguna Stockyard, Isuzu Pasig)
- **Manual Entry Fallback**: Text input for custom pickup and drop-off locations

### 4. **Sales Agent Assignment**

- Assign a sales agent to each allocation
- Track which agent is responsible for the sale

### 5. **Driver Assignment**

- Select from list of registered drivers
- Driver email stored for reliable matching
- Driver tracking via GPS in ViewShipment modal

### 6. **Real-time GPS Tracking**

- View shipment details with live GPS tracking
- 5-second automatic location updates
- Interactive map view with vehicle markers
- Current coordinates display

### 7. **Allocation Management**

- **Search**: Search by unit name, driver name, or conduction number
- **Pagination**: 6 items per page with page navigation
- **Edit**: Modify allocation details (unit info, driver, status)
- **Delete**: Remove allocations with confirmation
- **View Details**: Full shipment tracking modal

## Database Schema

### Allocation Document

```javascript
{
  _id: ObjectId,
  unitName: String,              // Vehicle model name
  unitId: String,                // Conduction number/VIN
  bodyColor: String,             // Vehicle color
  variation: String,             // Vehicle variation/trim
  assignedDriver: String,        // Driver username
  assignedDriverEmail: String,   // Driver email for matching
  assignedAgent: String,         // Sales agent username
  status: String,                // 'Pending', 'Assigned', 'In Transit', 'Delivered', 'Completed'
  allocatedBy: String,           // Admin username who created allocation
  date: Date,                    // Allocation creation date

  // Customer Information
  customerName: String,          // Customer full name (required)
  customerEmail: String,         // Customer email (required)
  customerPhone: String,         // Customer phone (optional)

  // Route Information
  pickupPoint: String,           // Pickup location name
  dropoffPoint: String,          // Drop-off location name
  pickupCoordinates: {
    latitude: Number,
    longitude: Number
  },
  dropoffCoordinates: {
    latitude: Number,
    longitude: Number
  },
  routeDistance: Number,         // Distance in km
  estimatedTime: Number,         // Estimated time in minutes

  // GPS Tracking
  currentLocation: {
    latitude: Number,
    longitude: Number
  }
}
```

## API Endpoints

### GET /getAllocation

Fetch all allocations

### POST /createAllocation

Create new allocation with customer info and route data

### PUT /updateAllocation/:id

Update existing allocation

### DELETE /deleteAllocation/:id

Delete allocation

### GET /getUsers

Fetch users (filtered for drivers and agents)

### GET /getStock

Fetch inventory (filtered for available vehicles)

## User Workflows

### Create Allocation from Stock

1. Click "+ Allocate New Driver"
2. Select "From Stock" mode
3. Select vehicle from dropdown
4. Select sales agent
5. Select driver
6. Enter customer information
7. Plan route using map or quick selection
8. Create assignment

### Create Allocation with Manual Entry

1. Select "Manual Entry" mode
2. Enter vehicle model and VIN
3. Select agent and driver
4. Enter customer info
5. Plan route
6. Create assignment

### View Shipment with GPS

1. Click allocation card
2. ViewShipment modal opens with live GPS
3. Location updates every 5 seconds
4. View full details

### Edit/Delete Allocations

- Edit: Modify unit details, driver, status
- Delete: Remove with confirmation

## Card Design

- **Header**: Unit name, date, colored status badge
- **Body**: Conduction #, color, variation, driver, route info, customer info
- **Actions**: View Details, Edit, Delete buttons

## Status Colors

- Pending: Yellow/amber
- In Transit: Blue
- Delivered/Completed: Green
- Default: Gray

## Validation Rules

- Vehicle, agent, driver required
- Customer name and email required
- Route required (map or manual)
- Prevents double allocation

## Testing Guide

1. Test stock vs manual mode
2. Test route planning (map + quick select)
3. Test GPS tracking updates
4. Test edit/delete operations
5. Test search and pagination
6. Test customer information display

## Dependencies

- axios, @react-native-picker/picker, react-native-maps
- ViewShipment, RouteSelectionModal components
- VehicleModels constants
- ThemeContext

## Documentation

Last Updated: November 2025  
Version: 2.0  
Location: `src/screens/allocations/DriverAllocationScreen.js`
