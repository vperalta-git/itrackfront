@echo off
echo 🚀 Building I-Track v48.0.0 - Route Planning and Enhanced Tracking Release
cd /d "d:\Mobile App I-Track\itrack"

echo 📝 Version: 48.0.0 with Route Planning System
echo ✨ Features: Interactive Route Planning, Real Pie Charts, Enhanced Tracking

echo 📝 Committing latest changes...
git add .
git commit -m "Release v48.0.0: Route Planning System, Real Pie Charts, Enhanced Tracking"

echo 🧹 Cleaning previous build...
cd android
.\gradlew clean

echo 📦 Building release APK with new features...
.\gradlew assembleRelease

echo 📱 Copying APK to main folder...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set timestamp=%mydate%_%mytime: =0%
copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v48.0.0-ROUTE-PLANNING-%timestamp%.apk"

echo ✅ APK Built Successfully!
echo 📍 Location: I-Track-v48.0.0-ROUTE-PLANNING-%timestamp%.apk
echo 🎯 New Features:
echo    - Interactive Route Planning System
echo    - Real-time Vehicle Tracking with expo-location
echo    - Map-based Pickup/Drop-off Selection
echo    - Real Pie Charts with react-native-chart-kit
echo    - Enhanced Driver Allocation with Route Info
echo    - Route Visualization with Polylines
pause