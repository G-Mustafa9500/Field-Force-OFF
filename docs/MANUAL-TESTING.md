# Manual Testing Checklist — Field Force v7

Use this checklist after deploying (or locally) before handing the app to real field staff.
Legend: ✅ pass, ❌ fail, ⚠️ pass with caveat. Record device/browser and server URL.

## 0. Prerequisites

- [ ] Backend healthy: `GET https://<backend>/api/health` returns `{ "status": "ok", "db": "connected" }`
- [ ] Frontend loads from the production URL and directly opening `/admin/reports` refreshes correctly (SPA rewrite).
- [ ] `.env` values are set in Vercel (not committed): `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `CLOUDINARY_*`.
- [ ] `CORS_ORIGIN` exactly matches the frontend origin (no trailing slash).
- [ ] Two test accounts exist: one `admin`, one `order_booker`/`delivery_boy`.
- [ ] Phone browser has camera + location permission; HTTPS is mandatory for both.
- [ ] MongoDB Atlas IP access allows Vercel egress (or `0.0.0.0/0` for a first smoke test).

## 1. First-time setup and auth

| # | Step | Expected |
|---|------|----------|
| 1.1 | Open `/setup` on a fresh database | Setup form appears |
| 1.2 | Submit with a 3-character password | Inline/API error, no admin created |
| 1.3 | Create admin with valid data | Success message; `/setup` now refuses a second admin |
| 1.4 | Log in with wrong password | "Email ya password galat hai"; no token stored |
| 1.5 | Log in with correct admin credentials | Redirect to `/admin` |
| 1.6 | Enter an employee URL `/admin` while logged in as employee | Redirected to `/employee` |
| 1.7 | Log out, then open `/admin` | Redirected to `/login` |
| 1.8 | Deactivate an employee in Admin → Employees, then use their old session | Next API call returns 401 and they are logged out |

## 2. Admin setup flow

| # | Step | Expected |
|---|------|----------|
| 2.1 | Settings → set petrol price to `280` | Saves; reload keeps value |
| 2.2 | Settings → try a non-numeric/negative price | Rejected |
| 2.3 | Shops → add a shop with current location | Shop appears in list with coordinates |
| 2.4 | Shops → add a shop without location | Rejected |
| 2.5 | Employees → add an order booker with bike average `45` | `EMP0001`-style id generated; password not shown in API response |
| 2.6 | Employees → add duplicate email | Rejected with a clear message |
| 2.7 | Routes → create a route for today, add 3 shops in order, assign the employee | Route appears; employee shows the route |
| 2.8 | Routes → reorder shops / remove one | Order persists after reload |
| 2.9 | Routes → change assigned employee | Old employee loses route, new employee gets it |
| 2.10 | Dashboard | Counts match attendance/sessions/check-ins/alerts |

## 3. Employee morning flow (real phone, GPS on)

| # | Step | Expected |
|---|------|----------|
| 3.1 | Employee logs in on mobile | `/employee` loads; today's route and shops visible |
| 3.2 | Tap **Check In** → allow camera → take live photo → allow location | Success toast; check-in time appears; GPS tracker shows "Live" |
| 3.3 | Deny location permission and retry | Clear error; no attendance row created |
| 3.4 | Lock the screen for 2 minutes, unlock | GPS resumes; screen wake-lock indicator shows when supported |
| 3.5 | Walk/drive ~1 km | Live KM counter increases |
| 3.6 | Try the shop check-in from >500 m away | Rejected with distance message |
| 3.7 | Try the second shop before the first | Rejected with "Pehle shop #1 visit karo" |
| 3.8 | Check in at shop #1 within 300 m | Green "Verified"; shop marked done |
| 3.9 | Check in at the same shop again | Rejected as duplicate |
| 3.10 | Check in at shop #2 at 350–500 m | Yellow warning recorded |
| 3.11 | Check out with live photo | Session ends; summary shows total KM, liters and rupees |
| 3.12 | Check out again | Rejected |
| 3.13 | Admin → Reports → Fuel for today | Employee's KM/liters/amount match the session |

## 4. Offline / poor network (critical)

Prepare: open DevTools → Network → Offline (or enable airplane mode after the app has loaded).

| # | Step | Expected |
|---|------|----------|
| 4.1 | Go offline; tap Check In (camera + last known GPS) | "Offline — save" toast; pending badge increments |
| 4.2 | Stay offline and check in at 2 shops | Both marked orange "sync pending" |
| 4.3 | Close the browser/app completely, reopen while still offline | Attendance/session state is rebuilt from IndexedDB; pending count is preserved |
| 4.4 | Re-enable internet | Auto-sync runs; "actions sync ho gayi" toast |
| 4.5 | Admin → Live/Reports | Offline check-ins and GPS points appear with real session ids |
| 4.6 | Repeat with the server temporarily returning 500 (or stop backend), then restore | Queue is **not** deleted; retry succeeds later |
| 4.7 | Leave one action failing permanently (e.g. invalid shop) | It retries up to 5 times, then is dropped; other actions still sync |

## 5. Fake-location detection

Requires an Android test device with "Mock location" developer setting, or a fake-GPS app.

| # | Step | Expected |
|---|------|----------|
| 5.1 | Start a session with a normal GPS reading | No fake-location alert |
| 5.2 | Switch to a mock-location app with accuracy `0`/`1` | Within ~30s, Admin → Alerts shows a purple FAKE LOCATION alert |
| 5.3 | Teleport >200 km/h between two readings | Speed-based alert |
| 5.4 | Keep the exact same coordinates for 5 readings | "Location bilkul static" alert |
| 5.5 | Keep spoofing for 5 minutes | Alerts are de-duplicated (no flood); each new window may create one |
| 5.6 | Admin marks alerts read / "Sab Read" | Badge count clears; list updates |

## 6. Real-time and date/time edges

| # | Step | Expected |
|---|------|----------|
| 6.1 | Keep Admin → Alerts open on another device; trigger a deviation | New alert appears without refresh (SSE) or within 15s (polling) |
| 6.2 | Check between 00:00 and 05:00 PKT | "Today" filters show the current local date, not yesterday |
| 6.3 | Set device timezone to UTC and repeat a date filter | Company timezone (`Asia/Karachi` by default) is still used |
| 6.4 | Open `/admin/reports` directly from a fresh tab | SPA loads (no 404) |
| 6.5 | Refresh while on `/employee` | SPA loads and session is restored |

## 7. Security / negative tests

| # | Step | Expected |
|---|------|----------|
| 7.1 | Call `GET /api/employees` with an employee token | 403 |
| 7.2 | Call `POST /api/tracking/update` with another employee's session id | 400, no location written |
| 7.3 | Call `POST /api/checkin` with another employee's session id | 400 |
| 7.4 | Send `lat: 91` / `lng: "abc"` | 400, no DB write |
| 7.5 | Send a 20 MB JSON/photo | 413 or 400, server stays up |
| 7.6 | Open `/api/sse?token=invalid` | 401; valid employee token → 403 |
| 7.7 | More than 20 login attempts/minute from one IP | 429 |
| 7.8 | Inspect any API response for `password` | Never present |
| 7.9 | Search the built frontend bundle for secrets | No `MONGO_URI`, JWT secret or Cloudinary secret |

## 8. PWA / install

| # | Step | Expected |
|---|------|----------|
| 8.1 | Open the production site on Android Chrome | "Add to Home screen" / install prompt available |
| 8.2 | Install and open the installed app | Standalone window, Field Force icon |
| 8.3 | Kill the app, enable airplane mode, reopen | App shell loads from cache; offline banner appears |
| 8.4 | Deploy a new frontend build, reopen online | New hashed assets load; no stale white screen |

## 9. Final sign-off

- [ ] Backend CI green (tests + coverage)
- [ ] Frontend CI green (tests + coverage + build)
- [ ] `/api/health` shows `db: connected`
- [ ] At least one full day simulated end-to-end (check-in → route → check-out → fuel report)
- [ ] Offline and fake-GPS scenarios passed
- [ ] No secrets in the repo or frontend bundle
- [ ] Atlas backup enabled and connection string stored only in Vercel

Tester: ____________________  Date: ____________  Build/commit: ____________
Device / OS / browser: ____________________  Backend URL: ____________________
