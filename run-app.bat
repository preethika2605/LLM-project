@echo off
title LLM Project Launcher
color 0A

echo ===================================================
echo           Starting Local LLM Project
echo ===================================================

echo.
echo [1/4] Cleaning up ports (8080, 5173)...
:: Force kill stale java/node processes to free up ports
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo Cleanup complete.

echo.
echo [2/4] Starting Backend (Spring Boot)...
start "LLM Backend" cmd /k "cd /d Backend && mvn clean package -DskipTests && cd target && java -jar backend-0.0.1-SNAPSHOT.jar > ../backend.log 2>&1"

echo.
echo Waiting 10 seconds for Backend to initialize...
timeout /t 10 /nobreak >nul

echo.
echo [3/4] Starting Frontend (Vite)...
start "LLM Frontend" cmd /k "cd /d Frontend && npm run dev"

echo.
echo [4/4] Launching Browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ===================================================
echo           Services Started Successfully
echo ===================================================
echo Backend: http://localhost:8080
echo Frontend: http://localhost:5173
echo.
pause
