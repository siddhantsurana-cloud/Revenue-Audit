@echo off
echo Committing and pushing updates to GitHub...
"C:\Program Files\Git\cmd\git.exe" add index.html sw.js run_server.py saved_users.json customer_rate_overrides.json saved_audits.json publish.bat
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto-update: %date% %time%"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo.
echo Updates pushed successfully!
pause
