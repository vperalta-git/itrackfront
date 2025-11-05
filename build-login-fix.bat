@echo off
echo 🚀 Building I-Track APK v47.2.0 - LOGIN FIX Edition...
cd /d "d:\Mobile App I-Track\itrack"

echo 📝 Version: 47.2.0 - Login Fix for Email Authentication
echo 🔧 Fixed: Email login support for vionneulrichp@gmail.com
echo 📱 Build Code: 49

echo 🧹 Cleaning previous build...
cd android
call gradlew.bat clean

echo 📦 Building release APK...
call gradlew.bat assembleRelease

echo 📋 Copying APK to main folder...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set timestamp=%mydate%_%mytime: =0%
copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-LOGIN-EMAIL-FIX-v47.2.0-%timestamp%.apk"

echo ✅ APK Built Successfully!
echo 📍 Location: I-Track-LOGIN-EMAIL-FIX-v47.2.0-%timestamp%.apk
echo 🔑 Login Fix: Now supports email authentication
echo 👤 Test User: vionneulrichp@gmail.com
pause