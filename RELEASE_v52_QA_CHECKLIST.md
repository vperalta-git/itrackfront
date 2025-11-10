# I-Track v52.0.0 Release - Quality Assurance Checklist

**Release Date:** November 9, 2025  
**APK:** I-Track-v52.0.0-RELEASE-2016.apk  
**Size:** 70.96 MB  
**Build Type:** Release (Signed)  
**Package:** com.acmobility.itrack

---

## ✅ Fixed Issues

### 1. Driver Allocation Scrolling (FIXED)

**Problem:** Driver allocation screen was not scrollable, interface stuck  
**Solution:** Wrapped entire screen in ScrollView with proper nested scrolling  
**File:** `screens/DriverAllocation.js`  
**Changes:**

- Added ScrollView wrapper with `showsVerticalScrollIndicator={false}`
- Set FlatList to `scrollEnabled={false}` and `nestedScrollEnabled={true}`
- Preserved all existing functionality

**Testing Steps:**

1. Login as Admin
2. Navigate to Driver Allocation (route planning)
3. ✓ Verify page scrolls smoothly
4. ✓ Verify vehicle list is accessible
5. ✓ Verify all buttons and inputs work

---

### 2. Google Maps Location Correction (FIXED)

**Problem:** Isuzu stockyard location was wrong (Cainta instead of Laguna)  
**Solution:** Updated coordinates to Santa Rosa, Laguna  
**File:** `components/RouteSelectionModal.js`  
**Changes:**

- Corrected coordinates: `14.3122, 121.1115` (Santa Rosa, Laguna)
- Updated address display to "Santa Rosa, Laguna"
- Added platform-specific map provider (PROVIDER_GOOGLE for Android)
- Added error handling with `onMapReady` and `onError` callbacks

**Testing Steps:**

1. Open Driver Allocation
2. Select a vehicle and click "Plan Delivery Route"
3. ✓ Verify "Isuzu Laguna Stockyard" location button shows
4. ✓ Click the button and verify map centers on Santa Rosa, Laguna
5. ✓ Verify coordinates are approximately 14.31, 121.11
6. ✓ Test route planning with this location

---

### 3. Bundle Loading Error (FIXED)

**Problem:** Previous debug APKs failed with "Unable to load script" error  
**Solution:** Built proper release APK with embedded JavaScript bundle  
**Changes:**

- Used `gradlew assembleRelease` instead of `assembleDebug`
- Bundle properly embedded via Expo CLI `export:embed` command
- Reduced APK size from 153MB (debug) to 71MB (release)

**Testing Steps:**

1. Install I-Track-v52.0.0-RELEASE-2016.apk
2. ✓ Verify app opens without "Unable to load script" error
3. ✓ Verify splash screen loads
4. ✓ Verify login screen appears
5. ✓ Test navigation through all screens

---

## 🔧 Technical Configuration

### Google Maps API

- **API Key:** AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo
- **SHA-1 Fingerprint:** 77:6D:59:61:87:95:50:05:2A:C1:1C:5F:47:A3:04:BC:21:5E:B5:1C
- **Package:** com.acmobility.itrack
- **Status:** ✅ Configured in AndroidManifest.xml
- **Note:** Free tier restrictions may apply - some maps features may require billing setup

### Build Configuration

- **React Native:** 0.74.5
- **Expo SDK:** 51.0.28
- **Android Gradle Plugin:** 8.2.1
- **Gradle:** 8.8
- **Min SDK:** 23
- **Target SDK:** 34

### Permissions

- ✅ ACCESS_FINE_LOCATION
- ✅ ACCESS_COARSE_LOCATION
- ✅ INTERNET
- ✅ READ_EXTERNAL_STORAGE
- ✅ WRITE_EXTERNAL_STORAGE

---

## 🧪 Complete Testing Checklist

### Core Functionality

- [ ] **Login**

  - [ ] Admin login works
  - [ ] Agent login works
  - [ ] Driver login works
  - [ ] Error messages display correctly

- [ ] **Admin Dashboard**

  - [ ] All statistics load correctly
  - [ ] Navigation drawer opens
  - [ ] All menu items accessible
  - [ ] Driver Allocation accessible from sidebar

- [ ] **Driver Allocation (PRIMARY FIX)**

  - [ ] Screen scrolls smoothly ✨ NEW
  - [ ] Vehicle list displays
  - [ ] Search functionality works
  - [ ] Filter dropdowns work
  - [ ] "Plan Delivery Route" button works
  - [ ] Route selection modal opens

- [ ] **Route Selection Modal (PRIMARY FIX)**

  - [ ] Modal opens without errors
  - [ ] Google Maps loads ✨ NEW
  - [ ] "Isuzu Laguna Stockyard" button shows ✨ NEW
  - [ ] Clicking button centers map on Laguna (14.31, 121.11) ✨ NEW
  - [ ] Current location button works
  - [ ] Custom destination input works
  - [ ] Route preview displays
  - [ ] "Select Route" button works

- [ ] **Maps Integration**

  - [ ] Maps display on all screens with maps
  - [ ] Location pins show correctly
  - [ ] Map controls (zoom, pan) work
  - [ ] Current location tracking works
  - [ ] Route drawing works

- [ ] **Vehicle Management**

  - [ ] Vehicle list loads
  - [ ] Vehicle details display
  - [ ] Vehicle assignment works
  - [ ] Vehicle status updates

- [ ] **Driver Management**
  - [ ] Driver list loads
  - [ ] Driver details display
  - [ ] Driver allocation saves
  - [ ] Driver tracking works

### Performance

- [ ] App launches in under 3 seconds
- [ ] Screens transition smoothly
- [ ] Maps load within 2 seconds
- [ ] No memory leaks during extended use
- [ ] Battery consumption is reasonable

### Network

- [ ] Works on WiFi
- [ ] Works on mobile data
- [ ] Handles poor network gracefully
- [ ] Shows network status indicators
- [ ] Offline mode works (if applicable)

---

## 🚨 Known Limitations

### Google Maps Free Tier

- **Issue:** Free Render hosting + Free Google Maps API may have quotas
- **Impact:** Maps may show blank or "For development purposes only" watermark
- **Solutions:**
  1. Enable billing on Google Cloud Console (credit card required)
  2. Verify API restrictions match release SHA-1 fingerprint
  3. Check daily quota usage in Google Cloud Console

### Backend Hosting

- **Platform:** Render.com (Free tier)
- **Limitations:**
  - May spin down after inactivity (slow first request)
  - Limited bandwidth
  - No guaranteed uptime

---

## 📋 Installation Instructions

### For Testers

1. **Uninstall** any previous I-Track versions
2. **Enable** "Install from Unknown Sources" in Android settings
3. **Transfer** APK to device: `I-Track-v52.0.0-RELEASE-2016.apk`
4. **Install** by tapping the APK file
5. **Grant** location permissions when prompted
6. **Test** all checklist items above

### For Users

1. Uninstall old version
2. Install I-Track-v52.0.0-RELEASE-2016.apk
3. Login with credentials
4. Start using the app

---

## 🔍 Troubleshooting

### If Maps Don't Load

1. Check internet connection
2. Verify location permissions granted
3. Try restarting the app
4. Check Google Maps API quota in Google Cloud Console
5. Contact admin if issue persists

### If App Crashes

1. Note the exact steps to reproduce
2. Check if it happens consistently
3. Try reinstalling the app
4. Report issue with screenshots

### If Bundle Error Still Occurs

- This should be fixed in release build
- If you see "Unable to load script", you may have an old APK
- Ensure you're installing **I-Track-v52.0.0-RELEASE-2016.apk**

---

## 📊 Version History

| Version | Date        | Changes                                                                          |
| ------- | ----------- | -------------------------------------------------------------------------------- |
| v51.0.0 | Nov 8, 2025 | Previous stable release                                                          |
| v52.0.0 | Nov 9, 2025 | Fixed: Driver allocation scrolling, Laguna map coordinates, bundle loading error |

---

## ✅ Pre-Release Verification (Developer)

- [x] Code compiles without errors
- [x] No syntax errors in JavaScript files
- [x] Bundle generated successfully (13,673ms, 1409 modules)
- [x] Google Maps API key configured
- [x] Location permissions declared
- [x] Release APK signed properly
- [x] APK size optimized (71MB vs 153MB debug)
- [x] All fixes implemented in code
- [x] Git repository clean

---

## 🎯 Success Criteria

This release is considered successful if:

1. ✅ App installs without errors
2. ✅ No "Unable to load script" error on startup
3. ✅ Driver Allocation screen is scrollable
4. ✅ Maps display in Route Selection
5. ✅ Isuzu Laguna Stockyard location is correct (Santa Rosa, not Cainta)
6. ✅ All core functionality works (login, navigation, allocation)

---

## 📞 Support

If you encounter any issues:

1. Check this document first
2. Verify all testing steps completed
3. Document the issue with screenshots
4. Contact development team

---

**Build Info:**

- Built: November 9, 2025 8:11 PM
- Build Command: `gradlew assembleRelease`
- Build Time: 9m 7s
- Tasks: 959 (841 executed, 118 up-to-date)
- Bundle Size: 767KB (compressed)
- Assets: 43 files copied

**Status:** ✅ READY FOR TESTING
