# Admin Dashboard Guide

## Overview

The Admin Dashboard provides a comprehensive view of the I-Track system, displaying real-time statistics, stock overview with interactive pie chart, and recent activities across vehicle preparation, shipments, and completed requests.

## Features

### 1. Dashboard Statistics Cards

Four main metric cards displaying:

- **Total Stocks**: Total number of vehicles in inventory
- **Finished Vehicle Preparation**: Count of completed vehicle preparations
- **Ongoing Shipment**: Number of shipments currently in transit
- **Ongoing Vehicle Preparation**: Count of vehicles currently being prepared

Each card is tappable and navigates to the relevant screen:

- Total Stocks → Inventory Screen
- Finished Vehicle Preparation → Reports Screen
- Ongoing Shipment → Driver Allocations Screen
- Ongoing Vehicle Preparation → Service Request Screen

### 2. Stocks Overview (Pie Chart)

Interactive pie chart displaying:

- Distribution of vehicles by model/unit name
- Color-coded segments for easy identification
- Absolute values shown on segments
- Legend below chart showing:
  - Color dot indicator
  - Vehicle model name
  - Quantity count

**Chart Colors** (matching web design):

- Red (#e50914) - Primary color
- Blue (#005d9bff) - Secondary color
- Black (#231f20) - Tertiary color
- Dark Blue (#234a5cff)
- Light Blue (#709cb7)
- Cyan (#00aaffff)

**Features:**

- Tap on segments to view details
- Pull-to-refresh to update data
- Automatic color assignment for up to 6 vehicle models
- Empty state message when no stock data available

### 3. Recent In Progress Vehicle Preparation

Table displaying up to 5 most recent vehicle preparations:

- **Conduction Number**: Vehicle registration/unit ID
- **Service**: List of services being performed (tinting, carwash, ceramic coating, etc.)

Shows empty state message when no preparations are in progress.

### 4. Recent Assigned Shipments

Table displaying up to 3 pending or in-transit shipments:

- **Unit Name**: Vehicle model/name
- **Assigned Driver**: Driver assigned to the shipment
- **Status**: Visual badge showing status (Pending/In Transit)

**Status Badge Colors:**

- Pending: Orange (#F59E0B)
- In Transit: Purple (#8B5CF6)

### 5. Recent Completed Requests

Table displaying up to 3 most recently completed requests:

- **Unit Name**: Vehicle model/name
- **Completed Date**: Date of completion (formatted as "Mon DD")
- **Remarks**: Additional notes or remarks

## API Endpoints Used

### Stock Data

```
GET /getStock
```

Returns array of inventory items with:

- unitName: Vehicle model name
- quantity: Number of units

### Completed Requests

```
GET /api/getCompletedRequests
```

Returns array of completed vehicle preparation requests.

### Service Requests

```
GET /api/getRequest
```

Returns all service requests with status filtering for "In Progress".

### Driver Allocations

```
GET /api/getAllocation
```

Returns all driver allocations with status filtering for:

- Pending
- In Transit
- Completed

## Data Flow

### Dashboard Load

1. Component mounts, `useEffect` triggers `fetchDashboardData()`
2. Parallel API calls fetch all data:
   - Stock count and distribution
   - Completed requests count
   - Service requests (filtered for In Progress)
   - Driver allocations (filtered by status)
3. Data processed and state updated
4. UI renders with fresh data

### Pull-to-Refresh

1. User pulls down on screen
2. `onRefresh()` triggered
3. `refreshing` state set to `true`
4. `fetchDashboardData()` called
5. Refresh indicator shows during fetch
6. Data updates, refresh indicator dismisses

### Pie Chart Data Processing

```javascript
const unitMap = {};
stockResponse.forEach((item) => {
  if (item.unitName) {
    unitMap[item.unitName] =
      (unitMap[item.unitName] || 0) + (item.quantity || 1);
  }
});
const pieData = Object.entries(unitMap).map(([name, value]) => ({
  name,
  population: value,
  color: CHART_COLORS[index % CHART_COLORS.length],
  legendFontColor: "#374151",
  legendFontSize: 14,
}));
```

## Component Structure

```
AdminDashboard
├── ScrollView (with RefreshControl)
│   ├── Dashboard Cards Grid (2x2)
│   │   └── TouchableOpacity Cards
│   ├── Stocks Overview Section
│   │   ├── Section Title
│   │   ├── PieChart (react-native-chart-kit)
│   │   └── Custom Legend
│   ├── Recent In Progress Preparation Section
│   │   ├── Section Title
│   │   └── Table (Conduction No., Service)
│   ├── Recent Assigned Shipments Section
│   │   ├── Section Title
│   │   └── Table (Unit Name, Driver, Status)
│   └── Recent Completed Requests Section
│       ├── Section Title
│       └── Table (Unit Name, Date, Remarks)
```

## Styling

### Colors

- Background: #F3F4F6 (light gray)
- Cards: COLORS.primary (#DC2626 red) or #374151 (dark gray)
- White sections: #FFFFFF with shadow
- Text primary: #000000
- Text secondary: #6B7280

### Spacing

- Card padding: SPACING.lg
- Section padding: SPACING.lg
- Card gap: SPACING.md
- Margin horizontal: SPACING.md

### Shadows

All sections and cards include shadow for depth:

- shadowColor: COLORS.black
- shadowOffset: { width: 0, height: 2 }
- shadowOpacity: 0.1
- shadowRadius: 8
- elevation: 3-4 (Android)

## Loading States

### Initial Load

Shows centered loading screen with:

- loading.gif animation (60x60)
- "Loading dashboard..." text below

### Pull-to-Refresh

Shows native refresh indicator at top of ScrollView.

## Empty States

Each section includes appropriate empty state messages:

- "No stock data available"
- "No vehicle preparation in progress"
- "No pending or in transit shipments"
- "No completed requests"

## Error Handling

All API calls wrapped in try-catch:

```javascript
try {
  const response = await apiGet("/endpoint");
  // Process data
} catch (error) {
  console.error("Error fetching data:", error);
} finally {
  setLoading(false);
  setRefreshing(false);
}
```

## Testing Guide

### Test 1: Dashboard Load

1. Login as Admin
2. Navigate to Dashboard
3. **Expected**: Dashboard loads showing all 4 metric cards with correct counts
4. **Expected**: Pie chart displays with stock distribution
5. **Expected**: All 3 tables show recent data (or empty states)

### Test 2: Pull-to-Refresh

1. On Dashboard, pull down from top
2. **Expected**: Refresh indicator appears
3. **Expected**: All data refreshes
4. **Expected**: Counts update if data changed
5. **Expected**: Refresh indicator disappears

### Test 3: Card Navigation

1. Tap "Total Stocks" card
2. **Expected**: Navigate to Inventory screen
3. Go back, tap "Ongoing Shipment" card
4. **Expected**: Navigate to Driver Allocations screen
5. Test all 4 cards

### Test 4: Pie Chart Display

1. Verify pie chart shows with colored segments
2. Check legend matches segment colors
3. Verify counts displayed correctly
4. **Expected**: Each segment labeled with vehicle model and count

### Test 5: Empty States

1. On test environment with no data
2. **Expected**: Each section shows appropriate empty message
3. **Expected**: No errors or blank screens

### Test 6: Real-time Data

1. Add a new vehicle in inventory (web or mobile)
2. Return to dashboard and pull-to-refresh
3. **Expected**: Total Stocks count increases
4. **Expected**: Pie chart updates with new vehicle model

### Test 7: Status Badges

1. View Recent Assigned Shipments table
2. **Expected**: Pending status shows orange badge
3. **Expected**: In Transit status shows purple badge
4. **Expected**: Text is readable on badge background

### Test 8: Table Data Accuracy

1. Compare dashboard tables with web version
2. **Expected**: Same data displayed
3. **Expected**: Dates formatted correctly (Mon DD)
4. **Expected**: Services displayed properly (comma-separated if multiple)

## Troubleshooting

### Pie Chart Not Displaying

**Symptom**: Pie chart section shows but no chart visible
**Causes**:

- No stock data in database
- API endpoint returning empty array
- Chart library not installed correctly

**Solutions**:

1. Check console for errors: `console.log('Stock data:', stockData)`
2. Verify `/getStock` endpoint returns data
3. Ensure react-native-chart-kit installed: `npm install react-native-chart-kit react-native-svg`
4. Check if stockData has correct format with `population` property

### Dashboard Not Loading

**Symptom**: Loading screen persists indefinitely
**Causes**:

- API endpoint unreachable
- Network error
- Backend server down

**Solutions**:

1. Check backend server status
2. Verify API_BASE_URL in config/api.js
3. Check network connectivity
4. Review error logs in console

### Tables Showing Empty States

**Symptom**: Tables show "No data" messages when data exists
**Causes**:

- Status filtering not matching database values
- Date sorting failing
- API response format mismatch

**Solutions**:

1. Verify status values in database match code (case-sensitive)
2. Check date fields exist in responses (createdAt, dateCreated)
3. Log API responses: `console.log('Response:', response.data)`

### Pull-to-Refresh Not Working

**Symptom**: Pull gesture doesn't trigger refresh
**Causes**:

- ScrollView not at top position
- RefreshControl not properly configured

**Solutions**:

1. Ensure scrolled to top of ScrollView
2. Verify RefreshControl in ScrollView props
3. Check `onRefresh` function called

## Performance Considerations

### Optimization Tips

1. **Data Caching**: Consider caching dashboard data for 30 seconds to reduce API calls
2. **Lazy Loading**: Load tables data only when scrolled into view
3. **Image Optimization**: Ensure loading.gif is optimized for mobile
4. **Chart Rendering**: Use `absolute` prop on PieChart for faster rendering

### Best Practices

- Always set loading states before API calls
- Handle errors gracefully with user-friendly messages
- Use pull-to-refresh instead of auto-refresh for better UX
- Keep table rows limited (max 3-5 per table) for scrollable view

## Future Enhancements

### Planned Features

1. **Interactive Pie Chart**: Tap segments to view detailed breakdown
2. **Date Range Filter**: Allow filtering dashboard data by date range
3. **Export Reports**: Generate PDF/Excel reports from dashboard data
4. **Real-time Updates**: WebSocket integration for live data updates
5. **Customizable Cards**: Allow admins to rearrange or hide cards
6. **Drill-down Navigation**: Tap table rows to view full details

### Additional Metrics

- Average preparation time
- Driver performance rankings
- Vehicle utilization rate
- Shipment delay alerts

## Dependencies

### Required Packages

```json
{
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "^15.2.0",
  "react-native-gifted-charts": "latest",
  "axios": "^1.10.0"
}
```

### Installation

```bash
# Install chart libraries
npm install react-native-chart-kit react-native-svg
# or
npx expo install react-native-chart-kit react-native-svg

# Install gifted charts (alternative)
npx expo install react-native-gifted-charts
```

## API Response Formats

### Stock Response

```json
[
  {
    "_id": "...",
    "unitName": "Isuzu MU-X",
    "quantity": 2,
    "color": "Gray",
    "variation": "3.0L MU-X 4x4 LS-E AT",
    "status": "Available"
  }
]
```

### Service Request Response

```json
[
  {
    "_id": "...",
    "vehicleRegNo": "ABC1234",
    "unitId": "NA2952",
    "service": ["Tinting", "Ceramic Coating"],
    "status": "In Progress",
    "createdAt": "2025-11-20T10:30:00Z"
  }
]
```

### Allocation Response

```json
[
  {
    "_id": "...",
    "unitName": "Isuzu D-Max",
    "variation": "3.0L 4x2 LS-A AT",
    "assignedDriver": "Test Driver 2",
    "status": "Pending",
    "date": "2025-11-20T14:00:00Z",
    "remarks": "Handle with care"
  }
]
```

---

**Last Updated**: November 21, 2025
**Version**: 1.0.0
**Author**: I-Track Development Team
