@echo off
echo ==============================
echo  Backup Central - Setup
echo ==============================
echo.

echo [1/2] Creating backup directory...
if not exist "Z:\BackupCentral" mkdir "Z:\BackupCentral"

echo [2/2] Setup complete!
echo.
echo Next steps:
echo  1. Run the init.sql on your MySQL server (10.0.0.249)
echo  2. Run start.bat to launch the app
echo.
pause
