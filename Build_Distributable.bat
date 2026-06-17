@echo off
title Build Revenue Assurance Portal Distributable
echo Building Revenue Assurance Portal distributables (Installer and Portable)...
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
echo Installing dependencies...
call npm install
echo Compiling and packaging app...
call npm run dist
echo.
echo Packaging complete! Check the newly created "dist" folder.
pause
