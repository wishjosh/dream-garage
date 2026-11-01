@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  pause
  exit /b 1
)
node scripts/start-circuit-study.mjs
pause
