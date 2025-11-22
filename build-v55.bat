@echo off
echo ================================
echo   I-TRACK v55.0.0 APK BUILD
echo ================================
echo.
echo 📱 Version: 55.0.0
echo 🔧 Features:
echo    - Fixed ProfileScreen account details editing bug
echo    - Added Accept/Reject allocation workflow in Driver Dashboard
echo    - Enhanced driver allocation status flow (Assigned → Accepted/Rejected)
echo    - Added visual status badges for accepted and rejected allocations
echo    - Improved driver UI with confirmation dialogs
echo.

cd /d "%~dp0"

echo 📝 Committing latest changes to Git...
git add .
git commit -m "v55.0.0: Fixed ProfileScreen editing, added Accept/Reject allocation in Driver Dashboard"

echo.
echo 🧹 Cleaning previous build artifacts...
cd android
call gradlew.bat clean

if errorlevel 1 (
    echo ❌ Clean failed!
    pause
    exit /b 1
)

echo.
echo 📦 Building release APK with Gradle...
echo ⏳ This may take 5-10 minutes...
call gradlew.bat assembleRelease

if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📋 Copying APK to root folder...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a%%b)
set mytime=%mytime: =0%
set timestamp=%mydate%_%mytime%

copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v55.0.0-%timestamp%.apk"

cd ..

echo.
echo ========================================
echo   ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 📍 APK Location: I-Track-v55.0.0-%timestamp%.apk
echo 📊 APK Size: 
dir "I-Track-v55.0.0-%timestamp%.apk" | find "apk"
echo.
echo 🎯 What's New in v55.0.0:
echo    ✅ BUG FIX: ProfileScreen now properly loads account details for editing
echo    ✅ BUG FIX: Vehicle Assignment now uses accountName instead of username
echo    ✅ BUG FIX: Driver allocations now properly match and display correctly
echo    ✅ FEATURE: Driver can now Accept or Reject allocations before delivery
echo    ✅ UI: Accept (green) and Reject (red) buttons for assigned allocations
echo    ✅ UI: Status badges for Accepted and Rejected allocations
echo    ✅ UX: Confirmation dialogs for accept/reject actions
echo    ✅ WORKFLOW: Assigned → Accept/Reject → Accepted → Out for Delivery → Delivered
echo    ✅ EXISTING: GPS location tracking with 5-second real-time updates
echo    ✅ EXISTING: Live map view with driver location markers
echo.
echo 📱 Ready for installation!
echo.
pause
