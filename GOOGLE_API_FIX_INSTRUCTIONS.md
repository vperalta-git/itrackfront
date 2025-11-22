# Google Maps API Restriction Fix Guide

## Current Status
- ✅ API Key: `AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo`
- ✅ All required APIs are enabled
- ❌ API Key restrictions are blocking requests
- ❌ Error: "This IP, site or mobile application is not authorized to use this API key"

## Problem
The API key has restrictions that are blocking:
1. Backend server requests (IP: 180.190.109.32)
2. Mobile app requests
3. Web requests

## Solution: Remove API Restrictions

### Step 1: Access Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account
3. Select your project (the one with the I-Track API key)

### Step 2: Find Your API Key
1. Look for the API key: `AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo`
2. Click on the key name to edit it

### Step 3: Remove Application Restrictions
1. Scroll to **"Application restrictions"**
2. Select **"None"**
3. This will allow the key to be used from any application

### Step 4: Update API Restrictions
1. Scroll to **"API restrictions"**
2. Select **"Don't restrict key"** OR ensure these APIs are checked:
   - ✅ Maps SDK for Android
   - ✅ Directions API
   - ✅ Geocoding API
   - ✅ Places API
   - ✅ Distance Matrix API

### Step 5: Save Changes
1. Click **"Save"** button at the bottom
2. Wait 5 minutes for changes to propagate

### Step 6: Test the API
Run this command in terminal:
```bash
cd "d:\Mobile App I-Track\itrack"
node test-google-maps.js
```

Expected output:
```
✅ Geocoding API is working
✅ Places API is working
```

## Alternative: Create New Unrestricted Key

If you don't want to modify the existing key:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy the new API key
4. Update these files with the new key:
   - `app.json` (line 35)
   - `android/app/src/main/AndroidManifest.xml` (line 21)
   - `itrack-backend/.env` (line 32)

## Verification

After fixing restrictions, verify in the app:
- 📍 Driver location tracking appears on map
- 🗺️ Routes are drawn between points
- 📌 Addresses can be searched
- 🚗 Real-time navigation works

## Security Recommendation

For production, use these restrictions:

### For Android App:
- Application restrictions: **Android apps**
- Add package name: `com.acmobility.itrack`
- Add SHA-1 fingerprint from your release keystore

### For Backend Server:
- Create a separate API key for backend
- Application restrictions: **IP addresses**
- Add server IP: `180.190.109.32`
- Add Render IPs if using Render hosting

## Troubleshooting

### Still getting "REQUEST_DENIED"?
1. Wait 5-10 minutes after saving changes
2. Clear browser cache
3. Restart the app
4. Check billing is enabled in Google Cloud Console

### Billing Issues?
- Google Maps gives $200 free credit per month
- Enable billing: https://console.cloud.google.com/billing
- Add payment method (won't be charged unless you exceed free tier)

### API Not Enabled?
Go to: https://console.cloud.google.com/apis/library
Search and enable:
- Maps SDK for Android
- Directions API
- Geocoding API
- Places API

## Support Links
- Google Cloud Console: https://console.cloud.google.com
- API Dashboard: https://console.cloud.google.com/apis/dashboard
- Billing: https://console.cloud.google.com/billing
- Quotas: https://console.cloud.google.com/apis/api/maps-android-backend.googleapis.com/quotas
