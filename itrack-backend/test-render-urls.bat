@echo off
echo 🔍 Testing Multiple Render URLs for I-Track Backend
echo =====================================================

set URLS[0]=https://itrack-backend.onrender.com
set URLS[1]=https://itrack-backend-api.onrender.com
set URLS[2]=https://itrack-backend-1.onrender.com
set URLS[3]=https://itrack-backend-nodejs.onrender.com

for /L %%i in (0,1,3) do (
    call set URL=%%URLS[%%i]%%
    echo.
    echo Testing: !URL!
    echo ----------------------------------------
    
    echo Testing /health endpoint...
    curl -s -w "Status: %%{http_code}" -o response.txt "!URL!/health"
    echo.
    echo Response:
    type response.txt
    echo.
    echo ----------------------------------------
    
    echo Testing /test endpoint...
    curl -s -w "Status: %%{http_code}" -o response.txt "!URL!/test"
    echo.
    echo Response:
    type response.txt
    echo.
    echo ========================================
)

del response.txt 2>nul

echo.
echo 💡 If any URL shows JSON responses instead of HTML, that's your working backend!
echo 💡 Update your mobile app to use the working URL.
pause
