@echo off
echo ================================
echo   I-TRACK v54.0.0 APK BUILD
echo ================================
echo.
echo 📱 Version: 54.0.0
echo 🔧 Features:
echo    - Fixed Vehicle Assignment modal empty content bug
echo    - Fixed Vehicle Tracking broken emoji crash
echo    - Updated UserManagementScreen to use correct DB fields
echo    - Changed History to Audit Trail with web-style layout
echo    - Updated InventoryScreen with Filter modal
echo    - Updated ServiceRequestScreen with Filter modal
echo    - Added "Age in Storage" field to vehicle cards
echo    - Database field mappings: name, email, phoneNo, picture
echo.

cd /d "%~dp0"

echo 📝 Committing latest changes to Git...
git add .
git commit -m "v54.0.0: Fixed critical bugs, updated to Audit Trail, improved filter UX, corrected database field mappings"

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

copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-v54.0.0-%timestamp%.apk"

cd ..

echo.
echo ========================================
echo   ✅ BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 📍 APK Location: I-Track-v54.0.0-%timestamp%.apk
echo 📊 APK Size: 
dir "I-Track-v54.0.0-%timestamp%.apk" | find "apk"
echo.
echo 🎯 What's New in v54.0.0:
echo    ✅ BUG FIX: Vehicle Assignment modal now shows all form fields
echo    ✅ BUG FIX: Vehicle Tracking no longer crashes (fixed emoji)
echo    ✅ UI: Changed History to Audit Trail with table-like design
echo    ✅ UI: Filter modals in Vehicle Stocks and Service Requests
echo    ✅ UI: Age in Storage field shows vehicle age (5d, 2w 3d format)
echo    ✅ DATA: UserManagement uses correct DB fields (name, email, phoneNo)
echo    ✅ DATA: picture field instead of profilePicture
echo    ✅ UX: Consistent filter UI across all list screens
echo.
echo 📱 Ready for installation!
echo.
pause
