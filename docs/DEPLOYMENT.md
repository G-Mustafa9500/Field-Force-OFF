# Deployment Guide — Field Force v7

This guide covers GitHub, MongoDB Atlas, Cloudinary, Vercel and the one-time
production checks. Deployment cannot be completed from a machine without your
accounts/tokens; everything in the repository is ready for you to run.

> **Never commit `.env` files.** Only `.env.example` is tracked. If a secret was
> ever pushed, rotate it before deploying.

---

## 0. What you need

| Account | Purpose | Free tier |
|---------|---------|-----------|
| GitHub | source + CI | yes |
| MongoDB Atlas | production database | M0 |
| Cloudinary | check-in/attendance photos | yes |
| Vercel | backend + frontend hosting | Hobby |

The app is a **monorepo**: `backend/` and `frontend/` live in one git repo. You
can keep one repo (recommended for the included root `.github/workflows/`) or
split it into two repos (see §7). Both layouts are supported.

---

## 1. MongoDB Atlas

1. Create a project and an **M0** cluster (region closest to your users, e.g.
   Mumbai/Singapore).
2. **Database Access → Add New Database User**
   - Authentication: password
   - Role: `Read and write to any database` (or scope to `field-force-db`)
   - Save the password in a password manager.
3. **Network Access → Add IP Address**
   - Vercel functions use dynamic egress IPs, so add `0.0.0.0/0` for the first
     deployment. Tighten later if you add a static egress proxy.
4. **Connect → Drivers → Node.js** and copy the URI. Add the database name:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/field-force-db?retryWrites=true&w=majority
   ```
   URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).
5. Enable **Backup** (continuous or scheduled) before real field data is added.

### Sync indexes after the first deploy (important)

New indexes are declared in the Mongoose models. Run once locally with the
production URI (during a maintenance window):

```powershell
cd backend
$env:MONGO_URI = "mongodb+srv://..."
npm run db:sync-indexes
Remove-Item Env:MONGO_URI
```

Expected output lists every model and ends with `All indexes are in sync.`

---

## 2. Cloudinary

1. Create a free account at <https://cloudinary.com/console>.
2. Copy **Cloud name**, **API Key** and **API Secret** from the dashboard.
3. No upload preset is needed; uploads are signed server-side.

Photos are delivered from public Cloudinary URLs by design (documented residual
risk in `docs/AUDIT.md`). Use authenticated delivery if photos become sensitive.

---

## 3. Local verification

```powershell
# Backend
cd backend
Copy-Item .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, Cloudinary keys
npm ci
npm test
npm run dev            # http://localhost:5000

# Frontend (second terminal)
cd frontend
Copy-Item .env.example .env
npm ci
npm run test:run
npm run dev            # http://localhost:3000
```

Open <http://localhost:3000/setup>, create the first admin, then complete the
admin setup flow. Health check: <http://localhost:5000/api/health> must show
`{ "status": "ok", "db": "connected" }`.

Generate a strong JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Vercel — backend

1. **Add New → Project → Import** your GitHub repo.
2. Configure:
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** leave empty (uses `vercel.json` / `@vercel/node`)
   - **Output Directory:** leave empty
   - **Install Command:** `npm ci`
   - **Node.js Version:** 22.x
3. **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|-------|
   | `MONGO_URI` | Atlas connection string |
   | `JWT_SECRET` | 48-byte random hex string |
   | `CORS_ORIGIN` | `https://<frontend>.vercel.app` (no trailing slash; comma-separate multiple) |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret |
   | `APP_TIMEZONE` | `Asia/Karachi` (or your company timezone) |
   | `NODE_ENV` | `production` |

   Optional rate limits: `AUTH_RATE_LIMIT`, `API_RATE_LIMIT`,
   `TRACKING_RATE_LIMIT`.
4. Deploy and verify:
   ```
   https://<backend>.vercel.app/api/health
   → {"status":"ok","db":"connected","time":"..."}
   ```
   The first request may take a few seconds while the serverless function
   connects to Atlas. `db: "connecting"` on the very first call is normal;
   repeat once.
5. If the health check reports `db: "disconnected"`, check the Atlas URI,
   database user permissions and Network Access.

> **SSE:** Vercel serverless functions time out long-lived responses, so the
> real-time alert stream may disconnect. The frontend polls every 15 seconds as
> a fallback. This is intentional and documented in `docs/AUDIT.md` (L4).

---

## 5. Vercel — frontend

1. Import the same repo again (or the frontend-only repo).
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
   - **Node.js Version:** 22.x
3. **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://<backend>.vercel.app/api` |
   | `VITE_APP_TIMEZONE` | `Asia/Karachi` |

   Vite inlines these at **build time** — redeploy after changing them.
4. Deploy, then set the backend's `CORS_ORIGIN` to the final frontend URL and
   redeploy the backend.
5. Verify:
   - `https://<frontend>.vercel.app/` loads.
   - Directly open `/admin/reports` and refresh — no 404 (SPA rewrite in
     `frontend/vercel.json`).
   - Login and run the smoke tests in §8.

---

## 6. GitHub + CI/CD

### 6.1 Push the monorepo

```powershell
cd C:\Users\TOSHIBA\Downloads\field-force-v7-final\field-force
git init -b main
git add .
git commit -m "Field Force v7: security fixes, tests, PWA and deployment setup"
git remote add origin https://github.com/<you>/field-force.git
git push -u origin main
```

Create the empty GitHub repo first (no README, no `.gitignore`). If Git asks
for credentials, use a PAT with `repo` scope or `gh auth login`.

CI runs automatically:

- `.github/workflows/backend-ci.yml` — `npm ci` + Jest coverage threshold 80%.
- `.github/workflows/frontend-ci.yml` — `npm ci` + Vitest coverage + Vite build.
- `.github/workflows/deploy.yml` — manual/tag deploy; skips safely when
  `VERCEL_TOKEN` is absent.

### 6.2 Configure deployment secrets (optional)

Repository **Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|--------|------------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `npx vercel link`, then `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID_BACKEND` | `.vercel/project.json` in the backend project → `projectId` |
| `VERCEL_PROJECT_ID_FRONTEND` | `.vercel/project.json` in the frontend project → `projectId` |

Deploy manually with **Actions → Deploy (Vercel) → Run workflow**, or push a
tag such as `git tag v1.0.0 && git push origin v1.0.0`.

### 6.3 Split into two repositories (optional)

The prompt asks for separate backend/frontend repositories. To do that while
keeping history:

```powershell
# From the monorepo root, after the first commit
git subtree split --prefix=backend  -b backend-only
git subtree split --prefix=frontend -b frontend-only

# Create two empty GitHub repos, then:
git push https://github.com/<you>/field-force-backend.git  backend-only:main
git push https://github.com/<you>/field-force-frontend.git frontend-only:main
```

`backend/.github/workflows/` and `frontend/.github/workflows/` contain
standalone CI/deploy workflows that work when each directory becomes the repo
root. Delete the root `.github/` if you no longer want the monorepo workflows.

---

## 7. Environment variable reference

### Backend

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGO_URI` | yes | Atlas URI incl. database name |
| `JWT_SECRET` | yes | long random string; rotating logs everyone out |
| `CORS_ORIGIN` | production | exact frontend origin(s), comma-separated |
| `CLOUDINARY_CLOUD_NAME` | yes for photos | |
| `CLOUDINARY_API_KEY` | yes for photos | |
| `CLOUDINARY_API_SECRET` | yes for photos | |
| `APP_TIMEZONE` | no | default `Asia/Karachi` |
| `AUTH_RATE_LIMIT` | no | default 20/min |
| `API_RATE_LIMIT` | no | default 600/min |
| `TRACKING_RATE_LIMIT` | no | default 120/min |
| `PORT` | local only | Vercel ignores it |

### Frontend

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_API_URL` | yes | backend URL **including `/api`**; `/api` locally uses the Vite proxy |
| `VITE_APP_TIMEZONE` | no | default `Asia/Karachi` |

---

## 8. Post-deploy smoke test

1. `GET /api/health` → `db: "connected"`.
2. Open `/setup` on the empty database, create the admin, log in.
3. Set petrol price, add a shop, an employee and today's route.
4. On a phone: check in with camera + GPS, check in at the first shop, check out.
5. Admin → Reports: KM/liters/amount match the session.
6. Open `/admin/reports` directly in a fresh tab → SPA loads.
7. Install the PWA; enable airplane mode and reopen → app shell loads.
8. Run the full checklist in `docs/MANUAL-TESTING.md`.

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Health `db: "disconnected"` | Atlas URI/credentials, IP allowlist, database name |
| Browser CORS error | `CORS_ORIGIN` must exactly match the frontend origin (scheme + host, no trailing slash); redeploy backend |
| Login works but API calls 401 | `JWT_SECRET` changed between deploys; log in again |
| Photos fail | Cloudinary keys missing/invalid, or image > 9 MB |
| Direct URL 404 on frontend | `frontend/vercel.json` rewrites missing / Root Directory not `frontend` |
| SSE alerts stop after ~30s | Expected on Vercel; polling fallback updates within 15s |
| CI `npm ci` fails | `package-lock.json` out of sync; run `npm install` and commit the lockfile |
| Vitest/Vite build fails on Node 20 | Use Node 22.x locally and in Vercel/CI (Vite 8 requirement) |
