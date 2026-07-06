# StillHere

A routine safety app for families. When Mom's daily journey (home → work → home) goes off schedule, her Android phone buzzes and asks her to send a quick message. If she doesn't respond within 5 minutes, you get notified with her location.

## How it works

| Checkpoint | Example | If late by 10 min |
|------------|---------|-------------------|
| Leave home | 1:00 PM | Still at home → buzz |
| Arrive at work | 2:00 PM | Not at work → buzz |
| Leave work | 6:00 PM | Still at work → buzz |
| Arrive home | 7:00 PM | Not home → buzz |

After the buzz, Mom has **5 minutes** to tap a preset or hold-to-talk. If she doesn't, you get an escalation alert on your iPhone dashboard.

## Project structure

```
stillhere/
├── server/      Express API + routine engine + SQLite
├── dashboard/   Next.js PWA for caregivers (iPhone)
└── mobile/      Expo Android app for Mom
```

## Quick start

### 1. Install dependencies

```bash
cd stillhere
npm install
```

### 2. Start the API

```bash
cp server/.env.example server/.env
npm run db:push --workspace=server
npm run dev:server
```

API runs at http://localhost:3001

### 3. Start the caregiver dashboard

```bash
npm run dev:dashboard
```

Open http://localhost:3000 on your iPhone (same Wi‑Fi) or computer.

### 4. Run the Android app

```bash
# Set your machine's LAN IP so the phone can reach the API
echo "EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3001" > mobile/.env

npm run dev:mobile
```

Scan the QR code with Expo Go, or build an APK:

```bash
cd mobile && npx expo run:android
```

## Setup flow

1. **You (iPhone):** Sign up at the dashboard → Add "Mom" → note the **pairing code**
2. **Set routine:** Work 2:00–6:00 PM, leave home 1:00 PM, arrive home 7:00 PM
3. **Set places:** Tap "Set home location" and "Set work location" (stand there with phone, or use map coords)
4. **Mom (Android):** Open app → enter pairing code → allow location (always) + notifications
5. Done — app runs quietly until something is late

## Environment variables

### server/.env

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path (`file:./dev.db`) |
| `JWT_SECRET` | Auth secret |
| `PORT` | API port (3001) |
| `VAPID_PUBLIC_KEY` | Web push (optional) |
| `VAPID_PRIVATE_KEY` | Web push (optional) |

Generate VAPID keys for iPhone push notifications:

```bash
npx web-push generate-vapid-keys
```

Add public key to `dashboard/.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### mobile/.env

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

Use your computer's LAN IP, not `localhost`.

## Production deployment ($0 — recommended)

**Full guide:** [docs/free-deployment.md](docs/free-deployment.md)

| Piece | Free solution |
|-------|---------------|
| Dashboard (your iPhone) | [GitHub Pages](https://tawfiqahmedabir.github.io/stillhere/) |
| API + database | Your PC + SQLite |
| Public HTTPS | [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free) |
| Mom's app | Expo Go or sideload APK (no Play Store fee) |

### Quick start (free)

```powershell
# 1. Install tunnel (once)
winget install Cloudflare.cloudflared

# 2. Start API + free HTTPS tunnel
npm run db:push
npm run free
```

Copy the `https://….trycloudflare.com` URL from the terminal.

```powershell
# 3. Set GitHub secret + redeploy dashboard
.\scripts\set-api-url.ps1 -ApiUrl "https://YOUR-URL.trycloudflare.com"
gh workflow run deploy-pages.yml --repo TawfiqAhmedAbir/stillhere

# 4. Point Mom's app at the same URL
echo EXPO_PUBLIC_API_URL=https://YOUR-URL.trycloudflare.com > mobile/.env
npm run dev:mobile
```

Then sign in on your iPhone: **https://tawfiqahmedabir.github.io/stillhere/**

> **Keep your PC on** while monitoring is active. Quick tunnel URLs change when you restart — run `set-api-url.ps1` again if that happens.

### GitHub Pages (dashboard only)

Auto-deploys on push to `main`. Requires secret `NEXT_PUBLIC_API_URL` pointing at your tunnel URL.

GitHub Pages cannot run the API — it only hosts the caregiver UI.

### Paid hosting (optional)

Railway, Render, Fly.io, Play Store ($25) — not required. See `docs/free-deployment.md` for the $0 path.

---

## Production deployment (legacy / paid options)

| Component | Suggested host |
|-----------|----------------|
| API | Railway, Fly.io, or Render |
| Dashboard | Vercel |
| Database | Switch SQLite → PostgreSQL (update `schema.prisma`) |
| Android | Google Play Store (build with EAS) |

## API overview

| Endpoint | Who | Purpose |
|----------|-----|---------|
| `POST /api/auth/register` | Caregiver | Create account |
| `POST /api/persons` | Caregiver | Add Mom, get pairing code |
| `PATCH /api/persons/:id/routine` | Caregiver | Set times |
| `PATCH /api/persons/:id/locations` | Caregiver | Set home/work GPS |
| `POST /api/device/pair` | Mom's phone | Link with pairing code |
| `POST /api/location/ping` | Mom's phone | Send GPS |
| `GET /api/device/active-alert` | Mom's phone | Poll for buzz |
| `POST /api/location/respond/*` | Mom's phone | Send reply |

The routine engine runs every minute via cron.

## License

Private — built for family use.
