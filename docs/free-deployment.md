# StillHere — 100% free deployment

Run everything at **$0/month**: GitHub Pages (dashboard) + your PC (API) + Cloudflare Tunnel (free HTTPS) + Expo Go or sideload APK (Mom).

## Architecture

```
Your iPhone                         Mom's Android
(GitHub Pages)                      (Expo Go / APK)
       │                                   │
       └─────────────┬─────────────────────┘
                     │ HTTPS
              Cloudflare Tunnel (free)
                     │
              Your PC :3001
              StillHere API + SQLite
```

| Piece | Free host | Cost |
|-------|-----------|------|
| Dashboard | GitHub Pages | $0 |
| API + database | Your PC + SQLite | $0 |
| Public HTTPS URL | Cloudflare Tunnel | $0 |
| Mom's app | Expo Go or sideload APK | $0 |
| Play Store listing | Skip (sideload instead) | $0 |

**Tradeoff:** Your PC must stay on (or use an old laptop 24/7). If it sleeps or shuts down, monitoring stops.

---

## Step 1 — Install cloudflared (one time)

### Windows

```powershell
winget install Cloudflare.cloudflared
```

Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Verify:

```powershell
cloudflared --version
```

---

## Step 2 — Start API + tunnel

From the project root:

```powershell
# First time only
cp server/.env.example server/.env
npm run db:push

# Starts API on :3001 AND a free HTTPS tunnel
npm run free
```

You'll see output like:

```
Your quick Tunnel has been created! Visit it at:
https://random-words-here.trycloudflare.com
```

**Copy that URL** — this is your public API address.

> **Note:** Quick tunnel URLs change every time you restart. For a stable URL, see [Stable tunnel (optional)](#stable-tunnel-optional) below.

---

## Step 3 — Point the dashboard at your API

1. Go to https://github.com/TawfiqAhmedAbir/stillhere/settings/secrets/actions
2. **New repository secret**
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://random-words-here.trycloudflare.com` (no trailing slash)
3. Re-run the deploy workflow:
   - Actions → **Deploy dashboard to GitHub Pages** → **Run workflow**

Or push any small change to `main`.

After ~1 minute, sign in at:

**https://tawfiqahmedabir.github.io/stillhere/**

---

## Step 4 — Mom's Android app

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://random-words-here.trycloudflare.com
```

Start Expo:

```bash
npm run dev:mobile
```

On Mom's phone:

1. Install **Expo Go** (free from Play Store)
2. Scan the QR code
3. Enter the **pairing code** from your dashboard
4. Allow **location (always)** and **notifications**

---

## Step 5 — Full setup (same as local)

1. **You:** Sign up on the GitHub Pages dashboard
2. **Add Mom** → copy pairing code
3. **Set routine:** 1:00 leave home, 2:00 work, 6:00 leave work, 7:00 home (adjust as needed)
4. **Set places:** home + work GPS pins
5. **Mom:** Pair app with code

Done — routine engine runs on your PC every minute.

---

## Stable tunnel (optional)

Quick tunnels get a **new URL on each restart**. For a URL that stays the same:

1. Create a free Cloudflare account: https://dash.cloudflare.com/sign-up
2. Add any domain you own to Cloudflare (or use a free subdomain service)
3. Create a named tunnel:

```powershell
cloudflared tunnel login
cloudflared tunnel create stillhere
```

4. Copy `cloudflared/config.example.yml` → `cloudflared/config.yml`, fill in tunnel ID and hostname
5. Route DNS:

```powershell
cloudflared tunnel route dns stillhere stillhere-api.yourdomain.com
```

6. Run:

```powershell
npm run free:stable
```

Use `https://stillhere-api.yourdomain.com` as `NEXT_PUBLIC_API_URL` permanently.

---

## Optional — iPhone push notifications (free)

Generate VAPID keys (free, self-hosted):

```bash
npx web-push generate-vapid-keys
```

Add to `server/.env`:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Add to GitHub secret (for dashboard rebuild):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... (public key only)
```

Restart API. On iPhone, allow notifications when the dashboard asks.

---

## Optional — sideload APK (no Play Store $25)

Build on your PC with Android Studio installed:

```bash
cd mobile
npx expo run:android --variant release
```

Copy the APK to Mom's phone (USB, Google Drive link, etc.) and install. Same `EXPO_PUBLIC_API_URL` baked in at build time.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Sign-in fails on iPhone | Check `NEXT_PUBLIC_API_URL` secret matches current tunnel URL; re-deploy Pages |
| Mom app can't connect | Update `mobile/.env` with same tunnel URL; restart Expo |
| Tunnel URL changed | Update GitHub secret + `mobile/.env`, redeploy |
| No alerts firing | PC must be on; API running (`npm run free`); home/work locations set |
| `cloudflared` not found | Install via winget (see Step 1) |

---

## What stays on your PC

- SQLite database (`server/prisma/dev.db`) — all accounts, routines, location history
- Routine engine (cron every minute)
- Voice message uploads (`server/uploads/`)

**Back up** `server/prisma/dev.db` occasionally if you care about history.

---

## Cost checklist

- [x] GitHub Pages — free
- [x] Cloudflare Tunnel — free
- [x] SQLite — free
- [x] Expo Go — free
- [x] Web Push (VAPID) — free
- [ ] Google Play developer — **skip** (sideload APK instead)
- [ ] Railway / Render / custom domain — **not needed**

**Total: $0**
