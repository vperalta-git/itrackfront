@echo off
REM I-Track Backend Health Check & Deployment Verification Script
REM This script tests all endpoints and verifies the backend is working correctly

echo 🚀 I-Track Backend Health Check Started
echo =======================================

set BASE_URL=%1
if "%BASE_URL%"=="" set BASE_URL=https://itrack-backend.onrender.com

echo Testing Base URL: %BASE_URL%
echo.

echo 📋 Testing Critical Endpoints:
echo ------------------------------

REM Test root endpoint
echo Testing GET / ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

REM Test health endpoint
echo Testing GET /health ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/health" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

REM Test config endpoints
echo Testing GET /api/config ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/api/config" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo Testing GET /api/mobile-config ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/api/mobile-config" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo Testing GET /test ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/test" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo.
echo 📋 Testing API Endpoints:
echo -------------------------

echo Testing GET /getUsers ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/getUsers" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo Testing GET /getAllocation ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/getAllocation" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo Testing GET /getStock ...
curl -s -w "%%{http_code}" -o nul "%BASE_URL%/getStock" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^)
) else (
    echo ❌ FAILED ^(%status%^)
)

echo.
echo 🔐 Testing Authentication:
echo --------------------------

echo Testing POST /login with sample credentials...
curl -s -w "%%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" -o nul "%BASE_URL%/login" > temp_status.txt 2>nul
set /p status=<temp_status.txt
if "%status%"=="200" (
    echo ✅ OK ^(%status%^) - Login endpoint working
) else if "%status%"=="401" (
    echo ✅ OK ^(%status%^) - Login endpoint working ^(invalid credentials expected^)
) else (
    echo ❌ FAILED ^(%status%^) - Login endpoint not responding
)

echo.
echo 📊 Health Check Summary:
echo ========================

echo Getting health status...
curl -s "%BASE_URL%/health" > health_response.txt 2>nul
echo Health Response:
type health_response.txt 2>nul

echo.
echo 🎉 Health Check Complete!
echo =========================
echo If all endpoints show ✅ OK, your backend is ready for production!
echo If you see ❌ FAILED, check the Render logs for detailed error information.

REM Cleanup temp files
del temp_status.txt 2>nul
del health_response.txt 2>nul

pause
