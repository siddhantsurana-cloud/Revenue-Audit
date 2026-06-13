@echo off
echo Committing and pushing updates to GitHub...
git add index.html sw.js
git commit -m "Auto-update: %date% %time%"
git push origin main
echo.
echo Updates pushed successfully!
pause
