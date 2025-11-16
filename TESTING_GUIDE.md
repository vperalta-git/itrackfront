# Driver Allocation Fix - Testing Guide

## 🎯 Quick Test Instructions

### 1️⃣ Start the App

```bash
npm start
# or
npx expo start
```

### 2️⃣ Login as Driver

- Username: `Test Driver 1` (or your driver account)
- Password: (your password)

### 3️⃣ Check Driver Dashboard

#### ✅ What You Should See:

```
┌─────────────────────────────────────┐
│ Driver Dashboard    👤 Profile Logout│
│ Welcome, Test Driver 1               │
│ 📧 driver1@example.com               │  ← EMAIL SHOULD SHOW
│ [🐛 Debug]                           │  ← DEBUG BUTTON
└─────────────────────────────────────┘

Tabs:
📋 Allocations | 🗺️ My Route | 📍 Maps
```

#### ❌ What Was Wrong Before:

```
Welcome, Unknown Driver  ← WRONG
(no email shown)
(no debug button)
📋 Assignments  ← OLD NAME
```

### 4️⃣ Click Debug Button

**Expected Console Output:**

```
🔍 ALL AsyncStorage:
  userToken: authenticated
  accountName: Test Driver 1
  userName: Test Driver 1
  userEmail: driver1@example.com     ← MUST HAVE EMAIL
  userId: 67abc123...
  userRole: Driver
  userPhone: +1234567890
```

**Alert Should Show:**
"AsyncStorage logged to console. Check Metro bundler for details."

### 5️⃣ Check Allocations Loading

**Expected Console Logs:**

```
🔍 Fetching allocations for driver
📧 Driver Email: driver1@example.com
📛 Driver Name: Test Driver 1
🌐 Fetching from: http://192.168.254.147:5000/getAllocation
✅ Matched allocations by EMAIL               ← PRIMARY METHOD
📊 Found 3 allocations for this driver
```

**Alternative Matching (if no email in database):**

```
⚠️ Matched allocations by EXACT NAME         ← FALLBACK
📊 Found 3 allocations for this driver
```

OR

```
⚠️ Matched allocations by PARTIAL NAME       ← LAST RESORT
📊 Found 3 allocations for this driver
```

### 6️⃣ Verify Allocations Tab

**If Allocations Exist:**

```
┌─────────────────────────────────┐
│      My Allocations             │  ← CHANGED FROM "ASSIGNMENTS"
│           3                     │
│    Active allocations           │
└─────────────────────────────────┘

[Vehicle Card 1]
[Vehicle Card 2]
[Vehicle Card 3]
```

**If No Allocations:**

```
┌─────────────────────────────────┐
│  No allocations found           │  ← CHANGED FROM "ASSIGNMENTS"
│  You don't have any vehicle     │
│  allocations yet.               │
│      [🔄 Refresh]               │
└─────────────────────────────────┘
```

---

## 🔧 Creating Test Allocation (Admin)

### 1️⃣ Logout from Driver Account

- Click "Logout" button
- Verify returns to login screen

### 2️⃣ Login as Admin

- Username: (admin account)
- Password: (admin password)

### 3️⃣ Navigate to Driver Allocation

- Find "Driver Allocation" in menu/drawer
- Open allocation creation screen

### 4️⃣ Create New Allocation

1. Select Vehicle/Stock
2. **Select Driver**: Choose "Test Driver 1"
   - System should automatically find driver's email
   - Email should be included in allocation data
3. Add Route Details:
   - Pickup Point: (address)
   - Dropoff Point: (address)
   - (Use route planner if available)
4. Add Customer Info (optional)
5. Click "Submit" or "Create Allocation"

### 5️⃣ Verify in Database (Optional)

Check MongoDB `driverallocations` collection:

```json
{
  "assignedDriver": "Test Driver 1",
  "assignedDriverEmail": "driver1@example.com",  ← MUST BE PRESENT
  "pickupPoint": "123 Start St",
  "dropoffPoint": "456 End Ave",
  "pickupCoordinates": { "latitude": 14.5995, "longitude": 120.9842 },
  "dropoffCoordinates": { "latitude": 14.6091, "longitude": 121.0223 }
}
```

### 6️⃣ Test Driver Sees Allocation

1. Logout from Admin
2. Login as "Test Driver 1"
3. Go to Driver Dashboard
4. Check "Allocations" tab
5. **Should see the newly created allocation!**

---

## 🐛 Troubleshooting

### Problem: Still Shows "Unknown Driver"

**Check Console for:**

```
❌ AsyncStorage check:
  - accountName: null     ← PROBLEM
  - userEmail: null       ← PROBLEM
```

**Solution:**

1. Logout completely
2. Close app
3. Reopen and login again
4. Check if AsyncStorage populates correctly

### Problem: No Allocations Show Up

**Check Console for:**

```
🔍 Fetching allocations for driver
📧 Driver Email: driver1@example.com
📛 Driver Name: Test Driver 1
❌ API ERROR: [error message]
```

**Possible Issues:**

1. **Backend not running**

   - Start backend: `cd itrack-backend && npm start`
   - Verify: http://192.168.254.147:5000/getAllocation

2. **No allocations in database**

   - Create test allocation as admin
   - Ensure `assignedDriverEmail` field exists

3. **Email mismatch**
   - Check driver email: Look at debug button output
   - Check allocation email: Look in database
   - They must match exactly (case-insensitive)

### Problem: Debug Button Not Showing

**Check:**

1. Make sure you're on Driver Dashboard (not Admin)
2. Look below email address in header
3. Should see small button with "🐛 Debug" text

**If Still Missing:**

- Code might not have updated
- Stop Metro bundler (Ctrl+C)
- Clear cache: `npx expo start -c`
- Restart app

### Problem: Allocations Tab Empty But Console Shows Found Data

**Check:**

```
✅ Matched allocations by EMAIL
📊 Found 3 allocations for this driver
```

**Possible Issues:**

1. Data structure mismatch
2. Rendering issue
3. State not updating

**Debug:**

1. Click "🔄 Refresh" button
2. Pull down to refresh list
3. Check console for state updates

---

## ✅ Success Indicators

### Everything is Working If:

- ✓ Driver name shows correctly (not "Unknown Driver")
- ✓ Email displays below name
- ✓ Debug button appears and works
- ✓ Console shows email-based matching
- ✓ Allocations load and display
- ✓ UI says "Allocations" everywhere (not "Assignments")
- ✓ My Route tab shows map with pickup/dropoff
- ✓ Logout clears data properly

### Console Output Should Look Like:

```
✅ AsyncStorage loaded
✅ Driver identified: Test Driver 1 (driver1@example.com)
✅ Fetching allocations...
✅ Matched by EMAIL
✅ Found 3 allocations
✅ UI Updated
```

---

## 📞 Still Having Issues?

### Collect This Information:

1. **Console logs** from Metro bundler
2. **Debug button** AsyncStorage dump
3. **Database query** result for allocations:
   ```js
   db.driverallocations.find({
     assignedDriverEmail: "driver1@example.com",
   });
   ```
4. **User data** from database:
   ```js
   db.users.findOne({
     accountName: "Test Driver 1",
   });
   ```

### Check These Files:

- `components/NewDriverDashboard.js` - Driver dashboard UI
- `screens/DriverAllocation.js` - Admin allocation creation
- `itrack-backend/server.js` - Backend API
- `App.js` line 442 - Component mapping

---

**Remember**: NewDriverDashboard.js is the ACTIVE component, not DriverDashboard.js!
