@echo off
REM Khoi dong API (apps/api) va Web (apps/web) cung luc
REM Chay tu thu muc goc repo: start-server.bat

echo.
echo ========================================
echo    UNICORNS EDU 5.0 - START SERVER
echo ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Chua cai Node.js. Tai tai: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Khong tim thay npm.
    pause
    exit /b 1
)

if not exist "apps\api" (
    echo ERROR: Khong tim thay thu muc apps\api
    pause
    exit /b 1
)

if not exist "apps\web" (
    echo ERROR: Khong tim thay thu muc apps\web
    pause
    exit /b 1
)

echo Dang kiem tra dependencies...
echo.

if not exist "apps\api\node_modules" (
    echo WARNING: API chua co node_modules. Dang cai dat...
    cd apps\api
    call npm install
    cd ..\..
    echo OK: API dependencies da cai xong
    echo.
)

if not exist "apps\web\node_modules" if not exist "apps\web\node_modules\next" (
    set "WEB_NEED_INSTALL=1"
)
if exist "apps\web\node_modules" if not exist "apps\web\node_modules\next" (
    set "WEB_NEED_INSTALL=1"
)
if defined WEB_NEED_INSTALL (
    echo WARNING: Web chua co day du node_modules (hoac thieu next). Dang cai dat...
    echo   Neu bi loi TAR hoac timeout, chay thu cong: cd apps\web ^&^& npm install
    cd apps\web
    call npm install
    if errorlevel 1 (
        echo.
        echo LOI: npm install that bai. Thu chay: npm cache clean --force roi npm install lai
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
    echo OK: Web dependencies da cai xong
    echo.
)

if not exist "apps\api\.env" (
    echo WARNING: Chua co file apps\api\.env
    echo   Tao file .env voi DATABASE_URL va cac bien can thiet
    echo.
)

echo ========================================
echo    DANG KHOI DONG SERVERS...
echo ========================================
echo.

echo Khoi dong API (NestJS - port 3001 hoac PORT trong .env)...
start "UniEdu API" cmd /k "cd apps\api && npm run dev"

timeout /t 3 /nobreak >nul

echo Khoi dong Web (Next.js - port 3000)...
start "UniEdu Web" cmd /k "cd apps\web && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    SERVERS DA KHOI DONG
echo ========================================
echo.
echo   API:  http://localhost:3001  (hoac PORT trong apps\api\.env)
echo   Web:  http://localhost:3000
echo.
echo Nhan phim bat ky de dong cua so nay...
echo (Cac server van chay trong cua so khac)
echo.
pause
