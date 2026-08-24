@echo off
title NCIIPC Supervisory Analytics Platform (SIH26157)
echo ========================================================
echo   NCIIPC SUPERVISORY ANALYTICS PLATFORM (SIH26157)
echo   Critical Sector Entity SOC Forensic Audit System
echo ========================================================
echo.
echo Launching Supervisory Web Server...

set ELECTRON_RUN_AS_NODE=1
"C:\Users\Shubham agrawal\AppData\Local\Programs\antigravity\Antigravity.exe" "%~dp0server.js"

pause
