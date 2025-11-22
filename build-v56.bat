@echo off
echo ================================
echo   I-TRACK v56.0.0 APK BUILD
echo ================================
echo.
echo 📱 Version: 56.0.0
echo 🔧 Critical Fixes:
echo    - FIXED: Driver Dashboard allocation filtering bug
echo    - FIXED: AsyncStorage priority (accountName before userName)
echo    - FIXED: LoginScreen now stores userId and userPhone
echo    - FIXED: VehicleAssignment uses accountName instead of username
echo    - ADDED: Comprehensive debug logging for troubleshooting
echo    - FEATURE: Driver Accept/Reject allocation workflow
echo    - FEATURE: Enhanced ProfileScreen account details editing
echo.

cd /d "%~dp0"

echo 📝 Committing latest changes to Git...
git add .
git commit -m "v56.0.0: CRITICAL FIX - Driver allocation filtering, AsyncStorage consistency, field matching"

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

copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v56.0.0-%timestamp%.apk"

cd ..

echo.
echo ========================================
echo   ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 📍 APK Location: I-Track-v56.0.0-%timestamp%.apk
echo 📊 APK Size: 
dir "I-Track-v56.0.0-%timestamp%.apk" | find "apk"
echo.
echo 🎯 What's New in v56.0.0:
echo    ✅ CRITICAL FIX: Driver Dashboard now shows allocations correctly
echo    ✅ BUG FIX: AsyncStorage loads accountName with proper priority
echo    ✅ BUG FIX: LoginScreen stores complete user data (userId, userPhone)
echo    ✅ BUG FIX: Vehicle Assignment uses accountName for driver matching
echo    ✅ DEBUG: Added comprehensive console logging for troubleshooting
echo    ✅ FEATURE: Driver Accept/Reject allocation workflow
echo    ✅ FEATURE: Visual status badges (Accepted, Rejected, Delivered)
echo    ✅ FEATURE: ProfileScreen properly loads account details for editing
echo    ✅ EXISTING: GPS location tracking with 5-second real-time updates
echo    ✅ EXISTING: Live map view with driver location markers
echo.
echo ⚠️  IMPORTANT: Users MUST logout and login again for fixes to take effect!
echo.
echo 📱 Ready for installation!
echo.
pause
