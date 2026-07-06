@echo off
REM Starts API + named Cloudflare tunnel (stable URL — requires cloudflared/config.yml)
cd /d "%~dp0.."

if not exist "cloudflared\config.yml" (
  echo Copy cloudflared\config.example.yml to cloudflared\config.yml and edit it first.
  exit /b 1
)

npx concurrently --kill-others ^
  --names "API,TUNNEL" ^
  "npm run dev:server" ^
  "cloudflared tunnel run --config cloudflared/config.yml"
