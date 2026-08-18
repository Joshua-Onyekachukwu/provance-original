# Provance Deployment Guide
## Step-by-Step: From Local Dev to Production

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────┐
│  VERCEL (Frontend)                  │
│  https://provanc3.vercel.app        │
│  React SPA + static assets          │
└──────────────┬──────────────────────┘
               │ API calls (HTTPS)
               ▼
┌─────────────────────────────────────┐
│  FLY.IO (Backend + Worker)          │
│  https://YOUR-APP.fly.dev           │
│  NestJS API + BullMQ worker         │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  SUPABASE    │ │  UPSTASH     │
│  PostgreSQL  │ │  Redis       │
│  + Auth      │ │  (BullMQ)    │
└──────────────┘ └──────────────┘
```

---

## STEP 1: Vercel Frontend (5 minutes)

### 1a. Open Vercel Dashboard
Go to: **https://vercel.com/dashboard**

### 1b. Find your project
Click on your **provance** project (or import from GitHub if not yet connected)

### 1c. Go to Settings → Environment Variables

### 1d. Paste these variables one by one:

**Variable 1:**
- Name: `SUPABASE_URL`
- Value: `https://YOUR-SUPABASE-PROJECT.supabase.co`
- Scope: Production, Preview, Development

**Variable 2:**
- Name: `SUPABASE_ANON_KEY`
- Value: `YOUR-SUPABASE-ANON-KEY`
- Scope: Production, Preview, Development

**Variable 3:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `YOUR-SUPABASE-SERVICE-ROLE-KEY`
- Scope: Production, Preview, Development

**Variable 4:**
- Name: `SUPABASE_JWKS_URL`
- Value: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/.well-known/jwks.json`
- Scope: Production, Preview, Development

**Variable 5:**
- Name: `SUPABASE_AUTH_REDIRECT_URL`
- Value: `https://provanc3.vercel.app/sign-in`
- Scope: Production, Preview, Development

**Variable 6:**
- Name: `SUPABASE_WAITLIST_TABLE`
- Value: `waitlist_applications`
- Scope: Production, Preview, Development

**Variable 7:**
- Name: `VITE_API_BASE_URL`
- Value: `https://YOUR-FLY-APP.fly.dev/v1` ← **REPLACE with your Fly.io app URL**
- Scope: Production, Preview, Development

**Variable 8:**
- Name: `VITE_USE_MOCK`
- Value: `false`
- Scope: Production, Preview, Development

**Variable 9:**
- Name: `FRONTEND_ORIGIN`
- Value: `https://provanc3.vercel.app`
- Scope: Production, Preview, Development

**Variable 10:**
- Name: `VITE_SENTRY_DSN`
- Value: `YOUR-SENTRY-DSN`
- Scope: Production, Preview, Development

### 1e. Redeploy
After adding all variables, go to **Deployments** tab → click **Redeploy** on the latest deployment.

---

## STEP 2: Fly.io Backend (10 minutes)

### 2a. Install flyctl (if not installed)
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS
curl -L https://fly.io/install.sh | sh

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2b. Login with your token
```bash
fly auth login --token YOUR-FLYIO-TOKEN
```

### 2c. Check your existing apps
```bash
fly apps list
```
Find your app name (it'll look like `provance-backend-xxxx` or similar)

### 2d. Set ALL secrets at once
Replace `YOUR-FLY-APP-NAME` with the app name from step 2c:

```bash
fly secrets set \
  PORT=4000 \
  FRONTEND_ORIGIN="https://provanc3.vercel.app" \
  TRUST_PROXY=true \
  HELMET_ENABLED=true \
  THROTTLE_TTL_MS=60000 \
  THROTTLE_LIMIT=60 \
  SUPABASE_URL="https://YOUR-SUPABASE-PROJECT.supabase.co" \
  SUPABASE_JWKS_URL="https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/.well-known/jwks.json" \
  SUPABASE_ANON_KEY="YOUR-SUPABASE-ANON-KEY" \
  SUPABASE_SERVICE_ROLE_KEY="YOUR-SUPABASE-SERVICE-ROLE-KEY" \
  SUPABASE_AUTH_REDIRECT_URL="https://provanc3.vercel.app/sign-in" \
  SUPABASE_WAITLIST_TABLE="waitlist_applications" \
  ADMIN_EMAILS="founder.admin@provance.local" \
  REDIS_URL="rediss://default:YOUR-UPSTASH-REDIS-URL" \
  DATABASE_URL="postgresql://postgres.YOUR-SUPABASE-PROJECT:YOUR-DATABASE-PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" \
  SENTRY_DSN="YOUR-SENTRY-DSN" \
  NVIDIA_API_KEY="YOUR-NVIDIA-API-KEY" \
  --app YOUR-FLY-APP-NAME
```

### 2e. Deploy (if not auto-deploying from GitHub)
```bash
fly deploy --app YOUR-FLY-APP-NAME
```

### 2f. Verify backend is healthy
```bash
curl https://YOUR-FLY-APP-NAME.fly.dev/v1/health/readiness
```
Should return: `{"status":"ok","services":{"database":"ready","redis":"ready"}}`

---

## STEP 3: Update Vercel with Backend URL (2 minutes)

After you know your Fly.io app name:

1. Go back to **Vercel → Settings → Environment Variables**
2. Update `VITE_API_BASE_URL` to: `https://YOUR-FLY-APP-NAME.fly.dev/v1`
3. Click **Save**
4. **Redeploy** the frontend

---

## STEP 4: Verify Everything Works (5 minutes)

### 4a. Frontend loads
Open: **https://provanc3.vercel.app**
- Landing page should load
- Favicon should show your Provance logo
- No console errors about missing env vars

### 4b. Auth works
1. Click **Sign In**
2. Create an account or use existing
3. Should redirect to dashboard

### 4c. Backend responds
Open: **https://YOUR-FLY-APP-NAME.fly.dev/v1/health/readiness**
- Should return `{"status":"ok"}`

### 4d. Sentry receives errors
1.故意 cause an error (or check existing ones)
2. Go to **https://sentry.io** → your project
3. Should see error reports appearing

---

## STEP 5: Railway (Optional — for redundancy)

If you want a backup backend on Railway:

### 5a. Connect GitHub repo
1. Go to **https://railway.app**
2. Click **New Project → Deploy from GitHub repo**
3. Select your Provance repo
4. Railway will auto-detect the NestJS backend

### 5b. Set environment variables
Go to **Variables** tab and paste from `docs/.env.railway`

### 5c. Get the Railway URL
After deployment, Railway gives you a URL like `https://provance-backend.up.railway.app`

### 5d. Update Vercel
You can use Railway as your `VITE_API_BASE_URL` instead of Fly.io, or keep both for redundancy.

---

## Quick Troubleshooting

### "CORS error" in browser console
→ `FRONTEND_ORIGIN` in Fly.io doesn't match your Vercel URL
→ Fix: Update `FRONTEND_ORIGIN` to exactly `https://provanc3.vercel.app`

### "Supabase auth fails"
→ `SUPABASE_AUTH_REDIRECT_URL` doesn't match
→ Fix: Ensure it's `https://provanc3.vercel.app/sign-in`

### "Redis connection refused"
→ `REDIS_URL` is wrong or Upstash instance is paused
→ Fix: Check Upstash dashboard, ensure instance is active

### "Worker not processing scans"
→ BullMQ worker isn't running or Redis is down
→ Fix: Check `fly logs --app YOUR-APP-NAME` for worker errors

### "Sentry not receiving errors"
→ DSN is wrong or `@sentry/react` not initialized
→ Fix: Check `VITE_SENTRY_DSN` in Vercel matches your Sentry project

---

## Summary Checklist

- [ ] Vercel: All 10 env vars pasted
- [ ] Vercel: `VITE_API_BASE_URL` updated with real Fly.io URL
- [ ] Vercel: Redeployed after env var changes
- [ ] Fly.io: All secrets set via `fly secrets set`
- [ ] Fly.io: Backend deployed and healthy
- [ ] Backend: `/v1/health/readiness` returns OK
- [ ] Frontend: Landing page loads at provanc3.vercel.app
- [ ] Auth: Sign up/in works
- [ ] Sentry: Errors appearing in dashboard
- [ ] (Optional) Railway: Backup backend deployed

---

## What's Already Done (Code Side)

✅ `vercel.json` — SPA rewrites for deep links
✅ `@sentry/react` — Frontend error tracking initialized
✅ `@sentry/nestjs` — Backend error tracking initialized  
✅ Logo PNGs resized and wired into all surfaces
✅ Code splitting — main bundle 560kB → 206kB
✅ VU billing system — size-aware pricing
✅ GridClassGuard parity — CI gates aligned
✅ All env vars documented in `docs/.env.vercel`, `docs/.env.flyio`, `docs/.env.railway`
