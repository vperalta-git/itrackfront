@echo off
echo =========================================
echo    I-TRACK DIRECT APK BUILD SCRIPT
echo =========================================
echo.
echo This script will build a production-ready APK
echo with your custom logo and all features enabled.
echo.

echo [1/5] Cleaning previous builds...
cd /d "c:\Users\Vionne\Desktop\Mobile App I-Track\itrack"
if exist "android\app\build\outputs\apk" rmdir /s /q "android\app\build\outputs\apk"

echo [2/5] Installing dependencies...
call npm install

echo [3/5] Pre-building Expo app...
call npx expo prebuild --platform android --clear

echo [4/5] Building APK with Gradle...
cd android
call .\gradlew assembleRelease

echo [5/5] Copying APK to desktop...
set APK_PATH=app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    copy "%APK_PATH%" "c:\Users\Vionne\Desktop\I-Track-v1.0.0.apk"
    echo.
    echo =========================================
    echo    SUCCESS! APK BUILD COMPLETE
    echo =========================================
    echo.
    echo APK Location: c:\Users\Vionne\Desktop\I-Track-v1.0.0.apk
    echo App Name: I-Track
    echo Version: 1.0.0
    echo Logo: Custom logoitrack.png
    echo Backend: RENDER-FIRST with local fallback
    echo.
    echo You can now install this APK on any Android device!
    echo.
) else (
    echo.
    echo =========================================
    echo    BUILD FAILED - APK NOT FOUND
    echo =========================================
    echo.
    echo Please check the build logs above for errors.
    echo.
)

echo Press any key to close...
pause >nul
