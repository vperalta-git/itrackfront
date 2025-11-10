@echo off
echo ================================
echo   I-TRACK v53.0.0 APK BUILD
echo ================================
echo.
echo 📱 Version: 53.0.0
echo 🔧 Features:
echo    - Fixed Driver Allocation scrollable form
echo    - Removed hardcoded credentials from backend
echo    - expo-location fully implemented
echo    - Google Maps API working
echo    - Live location tracking active
echo    - Unified theme colors (Isuzu Red)
echo.

cd /d "%~dp0"

echo 📝 Committing latest changes to Git...
git add .
git commit -m "v53.0.0: Security fix - removed hardcoded credentials, fixed driver allocation form UI"

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

copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v53.0.0-%timestamp%.apk"

cd ..

echo.
echo ========================================
echo   ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 📍 APK Location: I-Track-v53.0.0-%timestamp%.apk
echo 📊 APK Size: 
dir "I-Track-v53.0.0-%timestamp%.apk" | find "apk"
echo.
echo 🎯 What's New in v53.0.0:
echo    ✅ Security: Removed all hardcoded credentials
echo    ✅ UX: Driver allocation form now scrollable
echo    ✅ UX: Added close button to modal
echo    ✅ Consistent 52px input heights
echo    ✅ expo-location tracking verified
echo    ✅ Google Maps API fully working
echo    ✅ Backend environment validation added
echo.
echo 📱 Ready for installation!
echo.
pause
