@echo off
echo 🚀 Building I-Track APK using Gradle...
cd /d "C:\Users\Vionne\Desktop\Mobile App I-Track\itrack"

echo 📝 Committing latest changes...
git add .
git commit -m "Build: APK generation with latest updates"

echo 🧹 Cleaning previous build...
cd android
.\gradlew clean

echo 📦 Building release APK...
.\gradlew assembleRelease

echo � Copying APK to main folder...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set timestamp=%mydate%_%mytime: =0%
copy "app\build\outputs\apk\release\app-release.apk" "..\I-Track-GRADLE-%timestamp%.apk"

echo ✅ APK Built Successfully!
echo 📍 Location: I-Track-GRADLE-%timestamp%.apk
pause
