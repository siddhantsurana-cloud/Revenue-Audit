@echo off
title Revenue Assurance Portal (Web Version)
echo ----------------------------------------------
echo Starting Revenue Assurance Portal Web Server...
echo ----------------------------------------------
echo.
echo Opening: http://localhost:8500/index.html
echo.
python run_server.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to start server. Please make sure Python is installed.
    pause
)
