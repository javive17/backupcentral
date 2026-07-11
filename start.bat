@echo off
title Backup Central
cd /d "%~dp0backend"
echo ==============================
echo  Backup Central
echo  http://localhost:3080
echo  Login: admin / BackupCentral2026!
echo ==============================
echo.
node src/index.js
pause
