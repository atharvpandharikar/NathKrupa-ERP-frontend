@echo off
echo Nathkrupa Frontend Deployment
echo =============================
echo.
echo Choose deployment option:
echo 1. Deploy to AWS only
echo 2. Start local development
echo 3. Deploy to both
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Deploying to AWS...
    powershell -ExecutionPolicy Bypass -File "deploy.ps1" -Environment aws
) else if "%choice%"=="2" (
    echo Starting local development...
    npm run dev
) else if "%choice%"=="3" (
    echo Deploying to both environments...
    powershell -ExecutionPolicy Bypass -File "deploy.ps1" -Environment both
) else (
    echo Invalid choice. Please run again.
    pause
)
