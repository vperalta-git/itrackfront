@echo off
echo ================================
echo   I-TRACK v63.0.0 APK BUILD
echo ================================
echo.
echo 📱 Version: 63.0.0
echo 🔧 UI Improvements:
echo    - UPDATED: Header title from "I-Track System" to "I-Track"
echo    - REMOVED: Refresh button from Admin Dashboard
echo.

cd /d "%~dp0"

echo 📝 Committing latest changes to Git...
git add .
git commit -m "v63.0.0: UI cleanup - simplified header title and removed refresh button"

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

copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v63.0.0-%timestamp%.apk"

cd ..

echo.
echo ========================================
echo   ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 📍 APK Location: I-Track-v63.0.0-%timestamp%.apk
echo 📊 APK Size: 
dir "I-Track-v63.0.0-%timestamp%.apk" | find "apk"
echo.
echo 🎯 What's New in v63.0.0:
echo    ✅ UI: Simplified header from "I-Track System" to "I-Track"
echo    ✅ UI: Removed refresh button from Admin Dashboard header
echo    ✅ IMPROVED: Cleaner, more modern interface
echo.
echo 📱 Ready for installation!
echo.
echo 💡 Installation Steps:
echo    1. Uninstall old I-Track app from your device
echo    2. Install this new APK
echo    3. Open the app and login
echo.
pause
