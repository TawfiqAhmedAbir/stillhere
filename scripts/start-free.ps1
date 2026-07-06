@echo off
REM Starts StillHere API + free Cloudflare quick tunnel (Windows)
echo.
echo === StillHere free stack ===
echo API will run on http://localhost:3001
echo Cloudflared will print a public HTTPS URL — copy it for:
echo   - GitHub secret NEXT_PUBLIC_API_URL
echo   - mobile/.env EXPO_PUBLIC_API_URL
echo.
echo Keep this window open. Press Ctrl+C to stop.
echo.

where cloudflared >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo ERROR: cloudflared not found. Install with:
  echo   winget install Cloudflare.cloudflared
  exit /b 1
)

cd /d "%~dp0.."
call npx concurrently --kill-others ^
  --names "API,TUNNEL" ^
  --prefix-colors "blue,green" ^
  "npm run dev:server" ^
  "cloudflared tunnel --url http://localhost:3001"
