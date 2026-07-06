# Deploy StillHere API to Fly.io (24/7, no PC required)

The API runs on **Fly.io** (always on, London region). Database is **SQLite on a Fly volume** (free, persistent).

| Service | Free tier | Role |
|---------|-----------|------|
| [Fly.io](https://fly.io) | Free allowance* | API + SQLite DB + routine engine 24/7 |
| GitHub Pages | Free | Dashboard (caregiver UI) |

\*Fly.io may ask for a credit card to verify identity.

**Live API:** https://stillhere-api.fly.dev

> Neon PostgreSQL is optional — the app currently uses SQLite on Fly's free 1GB volume.

---

## Step 1 — Create free Neon database (5 min)

1. Go to https://neon.tech and sign up (free).
2. Create a project named `stillhere`.
3. Copy the **connection string** (starts with `postgresql://…`).
4. Keep it — you'll paste it into Fly secrets in Step 3.

---

## Step 2 — Install Fly CLI (once)

```powershell
winget install Fly-io.flyctl
```

Sign up / log in:

```powershell
fly auth signup
# or: fly auth login
```

---

## Step 3 — Deploy the API

From the project root:

```powershell
cd C:\Users\tawfi\stillhere\server

# Create the app (first time only)
fly apps create stillhere-api

# Create persistent volume for voice uploads
fly volumes create stillhere_data --region lhr --size 1

# Set secrets (paste your Neon URL + a random JWT secret)
fly secrets set DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING" JWT_SECRET="pick-a-long-random-string-here"

# Deploy
fly deploy
```

When it finishes, test:

```powershell
curl https://stillhere-api.fly.dev/health
```

You should see: `{"status":"ok","service":"stillhere-api"}`

---

## Step 4 — Point dashboard + Mom's app at Fly

```powershell
cd C:\Users\tawfi\stillhere
.\scripts\set-api-url.ps1 -ApiUrl "https://stillhere-api.fly.dev"
gh workflow run deploy-pages.yml --repo TawfiqAhmedAbir/stillhere
```

Update Mom's app (`mobile/.env`):

```
EXPO_PUBLIC_API_URL=https://stillhere-api.fly.dev
```

**You can stop `npm run free` and close Cloudflare Tunnel** — the API no longer runs on your PC.

---

## Step 5 — Use the app

1. **iPhone:** https://tawfiqahmedabir.github.io/stillhere/ → sign up
2. **Mom:** Expo Go + pairing code

---

## Redeploy after code changes

```powershell
cd server
fly deploy
```

Or push to `main` — GitHub Actions auto-deploys if you add a `FLY_API_TOKEN` secret (see below).

---

## Optional — auto-deploy from GitHub

1. Create a Fly deploy token:
   ```powershell
   fly tokens create deploy -x 999999h
   ```
2. Add to GitHub: **Settings → Secrets → Actions → `FLY_API_TOKEN`**

The workflow `.github/workflows/deploy-api.yml` deploys on every push to `main` that touches `server/`.

---

## Local development

Use the same Neon database for local dev:

```powershell
cp server/.env.example server/.env
# paste Neon DATABASE_URL into server/.env
npm run db:push
npm run dev:server
```

---

## Cost

| Item | Cost |
|------|------|
| Neon PostgreSQL | $0 (free tier) |
| Fly.io API | $0 within free allowance |
| GitHub Pages | $0 |
| Expo Go | $0 |
| **Total** | **$0/month** |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `fly deploy` fails on volume | Run `fly volumes create stillhere_data --region lhr --size 1` |
| Database connection error | Check `DATABASE_URL` secret: `fly secrets list` |
| Sign-in fails on iPhone | Re-run `set-api-url.ps1` with `https://stillhere-api.fly.dev` |
| App name taken | Change `app = "..."` in `server/fly.toml` to something unique |
