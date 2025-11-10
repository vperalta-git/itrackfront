# 📱 I-Track v52.0.0 Installation & Testing Guide

## 🎯 What's Fixed in This Version

✅ **Driver Allocation Screen Now Scrolls!**

- You can now scroll through the entire driver allocation page
- All vehicles and controls are now accessible

✅ **Correct Map Location for Isuzu Laguna**

- Fixed: Stockyard location now shows Santa Rosa, Laguna (not Cainta)
- Route planning will use the correct starting point

✅ **App Works Without Errors**

- No more "Unable to load script" errors
- Proper release build for smooth operation

---

## 📥 Installation Instructions

### Step 1: Uninstall Old Version

1. Go to your phone's **Settings**
2. Tap **Apps** or **Applications**
3. Find **I-Track**
4. Tap **Uninstall**
5. Confirm uninstallation

### Step 2: Enable Unknown Sources (If Needed)

1. Go to **Settings** → **Security**
2. Enable **"Install from Unknown Sources"** or **"Allow from this source"**
3. (On newer Android: You'll be asked to allow when installing)

### Step 3: Install New Version

1. Download: **I-Track-v52.0.0-RELEASE-2016.apk** (71 MB)
2. Open the APK file from your Downloads folder
3. Tap **Install**
4. Wait for installation to complete
5. Tap **Open** or find I-Track in your app drawer

### Step 4: Grant Permissions

When you first open the app, it will ask for permissions:

- ✅ **Location** - Tap "Allow" (required for maps and tracking)
- ✅ **Storage** - Tap "Allow" (required for images and files)

---

## 🧪 Testing the Fixes

### Test 1: Check Driver Allocation Scrolling

1. **Login** as Admin
2. Go to **Driver Allocation** (from sidebar menu)
3. **Try scrolling** up and down
4. ✅ **Success:** Page scrolls smoothly, all vehicles visible

### Test 2: Check Map Location

1. In **Driver Allocation**, select any vehicle
2. Tap **"Plan Delivery Route"** button
3. Look for **"Isuzu Laguna Stockyard"** button
4. Tap it and watch the map
5. ✅ **Success:** Map centers on Santa Rosa, Laguna area
   - Coordinates should be around 14.31, 121.11
   - Should NOT be in Cainta area anymore

### Test 3: Check App Stability

1. Close the app completely
2. Open it again
3. Navigate through different screens
4. ✅ **Success:** No errors, no crashes, smooth navigation

---

## ⚠️ Important Notes

### About Google Maps

- Maps should load and work normally
- If you see **"For development purposes only"** watermark, that's okay - maps still work
- If maps don't load at all:
  - Check your internet connection
  - Make sure location permissions are granted
  - Try restarting the app

### About the Backend

- The app connects to a free server (Render.com)
- First request might be slow (server wakes up from sleep)
- This is normal for free hosting

### If You See Errors

- Take a screenshot
- Note what you were doing when it happened
- Report to the development team

---

## 📊 Version Information

- **Version:** 52.0.0
- **Release Date:** November 9, 2025
- **APK Name:** I-Track-v52.0.0-RELEASE-2016.apk
- **Size:** 71 MB
- **Build Type:** Release (Production)

---

## 🔧 Troubleshooting

### Problem: App Won't Install

**Solution:**

- Uninstall old version first
- Enable "Install from Unknown Sources"
- Try restarting your phone

### Problem: Maps Are Blank

**Solution:**

- Check internet connection
- Grant location permissions
- Restart the app
- Wait a few seconds for maps to load

### Problem: App Crashes on Startup

**Solution:**

- Make sure you're using **I-Track-v52.0.0-RELEASE-2016.apk**
- Delete old APK files
- Reinstall fresh

### Problem: Driver Allocation Still Not Scrolling

**Solution:**

- Make sure you installed the new version (check Settings → Apps → I-Track → Version: 52.0.0)
- If it still shows old version, uninstall completely and reinstall

---

## ✅ What to Test

Please test these features and report any issues:

### Must Test (High Priority)

- [ ] Login works (Admin, Agent, Driver)
- [ ] Driver Allocation screen scrolls
- [ ] Maps show in route planning
- [ ] Isuzu Laguna location is correct (Santa Rosa, not Cainta)
- [ ] Vehicle assignment works
- [ ] Route planning saves correctly

### Nice to Test (Medium Priority)

- [ ] All navigation menus work
- [ ] Dashboard statistics load
- [ ] Vehicle list displays
- [ ] Driver list displays
- [ ] Search functions work

### Can Test (Low Priority)

- [ ] App works on WiFi
- [ ] App works on mobile data
- [ ] App handles poor network
- [ ] Battery usage is reasonable

---

## 📞 Support

If you encounter problems:

1. **Check this guide** - solution might be here
2. **Try basic troubleshooting** - restart app, check internet
3. **Take screenshots** - helps us understand the issue
4. **Report to dev team** - with details about what happened

---

## 🎉 Thank You for Testing!

Your feedback helps us improve I-Track for all users.

**Happy Testing! 🚀**

---

**File to Install:** I-Track-v52.0.0-RELEASE-2016.apk  
**Where to Find It:** d:\Mobile App I-Track\itrack\I-Track-v52.0.0-RELEASE-2016.apk
