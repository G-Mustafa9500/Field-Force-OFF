# Field Force v7 — Security & Code Audit

Audit date: 2026-11-02
Scope: `backend/` (Express + Mongoose) and `frontend/` (React 19 + Vite).
Method: manual code review, dependency inspection, automated unit/integration tests, production build.

Legend: **CRITICAL** = data loss / auth bypass / money impact, **HIGH** = realistic abuse or broken core flow, **MEDIUM** = robustness or defence-in-depth, **LOW** = hygiene.

---

## 1. Findings and remediation

### CRITICAL

| # | Finding | Location (before fix) | Fix | Status |
|---|---------|-----------------------|-----|--------|
| C1 | **IDOR / session hijack.** Any authenticated employee could post GPS points, shop check-ins or fake-location reports into another employee's `DaySession` by sending that session id. | `backend/routes/tracking.js` update/end, `backend/routes/checkin.js`, `backend/routes/fakeLocation.js` | All session lookups now filter by `employee: req.user._id` (and `status: "active"` where required). `findOwnedSession()` in `backend/routes/tracking.js:29` is the single resolver. | Fixed |
| C2 | **Fuel reimbursement fraud.** `POST /api/tracking/end` accepted `req.body.totalKm` from the client, so kilometres and fuel amount could be inflated. | `backend/routes/tracking.js` end handler | Server recomputes distance from stored `LocationLog` points only (`tracking.js:198-218`). Client `totalKm` is ignored. Fuel is rounded once from the raw distance. | Fixed |
| C3 | **Offline field work was deleted.** Queued actions with `offline_*` session ids were rejected with 400 and then removed by the sync manager. A full day of GPS/check-ins could be lost. | `frontend/src/utils/syncManager.js` | Two-phase sync: `TRACKING_START` first, then remap `offline_*` → real id in IndexedDB; defer (never delete) on unknown ids; delete only on permanent 4xx after 5 attempts (`syncManager.js:86-172`). Backend also resolves `offline_*` ids to the employee's active session (`tracking.js:29-38`, `checkin.js:44-50`, `fakeLocation.js:29-35`). | Fixed |

### HIGH

| # | Finding | Location (before fix) | Fix | Status |
|---|---------|-----------------------|-----|--------|
| H1 | Attendance/session/route "today" used **UTC** (`toISOString()`), so between 00:00–05:00 PKT the app read yesterday's data. | `backend/routes/*.js`, `frontend/src/pages/admin/*` | `backend/utils/dateUtils.js` and `frontend/src/utils/date.js` use `Intl.DateTimeFormat` with `APP_TIMEZONE` / `VITE_APP_TIMEZONE` (default `Asia/Karachi`). All date filters use them. | Fixed |
| H2 | **Double check-in race.** Two taps could both pass `findOne` and create two attendance rows. | `backend/routes/attendance.js:23-52` | Unique index `{ employee, date }` (`models/Attendance.js:20`) + `11000` handling at `attendance.js:59`. | Fixed |
| H3 | **Duplicate shop visit race.** Same shop could be checked twice in parallel. | `backend/routes/checkin.js:118-146` | Unique index `{ employee, shop, date }` (`models/ShopCheckIn.js:22`) + `11000` handling at `checkin.js:160`. | Fixed |
| H4 | **Unbounded `LocationLog` growth.** A full day at 30s intervals plus retries could approach MongoDB's 16 MB document limit. | `backend/routes/tracking.js` | `$push` uses `$slice: -2880` (`tracking.js:121-144`), capping at 24h of 30s samples. | Fixed |
| H5 | **Deactivated employees kept working for up to 7 days** with an existing JWT. | `backend/middleware/auth.js:15-18` | `protect` loads the user and rejects `!isActive`; login also filters `isActive: true`. | Fixed |
| H6 | **Password field exposure risk.** Schema default allowed `password` in query results. | `backend/models/User.js:7` | `select: false`, explicit `.select('+password')` only in login, and `toJSON` strips it. | Fixed |
| H7 | **First-admin setup race.** Two simultaneous setup calls could both create admins. | `backend/routes/auth.js:67-72` | Atomic `Setting` upsert lock (`admin_setup_lock`) before creating the admin. | Fixed |
| H8 | **No rate limiting.** Login brute force and GPS/alert floods were unrestricted. | `backend/server.js` | Per-route limits: auth 20/min, tracking 120/min, API 600/min, with env overrides (`server.js:43-66`). | Fixed |
| H9 | **CORS allowed every origin** in production. | `backend/server.js` | `CORS_ORIGIN` allowlist; empty only for local dev (`server.js:14-29`). | Fixed |
| H10 | **SSE endpoint had no authentication** (anyone could subscribe to admin alerts). | `backend/server.js:71-90` | JWT verification + admin/active check before opening the stream. | Fixed |
| H11 | **Alert spam.** Every 30s GPS point outside the route created a new alert; every fake-location update created another. | `backend/routes/tracking.js:147-180`, `fakeLocation.js:53-59` | 5-minute deviation dedup and 2-minute fake-location dedup, backed by an index. | Fixed |
| H12 | **Unvalidated GPS data** (`NaN`, out-of-range coordinates, empty strings) could corrupt distance math and create false alerts. | `backend/routes/*` | `backend/utils/validation.js`: `normalizeLocation`, `isImageDataUri`, `asString`; NaN-safe `geoUtils` returns `NaN` instead of throwing. | Fixed |
| H13 | **Frontend GPS could fall back to `{lat:0,lng:0}`** when a watch position was aborted. | `frontend/src/pages/employee/EmployeeHome.jsx` | Aborted reads are ignored; last known position is used only when it exists; checkout now queues `TRACKING_END` if the online call fails. | Fixed |
| H14 | **Route visit order was not enforced** and a shop outside the assigned route could be checked in. | `backend/routes/checkin.js:84-115` | Order is enforced (`shop #N` message) and non-route shops return 400. | Fixed |

### MEDIUM

| # | Finding | Location | Fix | Status |
|---|---------|----------|-----|--------|
| M1 | Settings endpoint accepted arbitrary keys/documents. | `backend/routes/settings.js` | Allowlist (`petrol_price`) + positive numeric range `0 < value <= 10000`. | Fixed |
| M2 | Employee/route assignment could desynchronise (`Route.assignedTo` set but `User.assignedRoute` left empty; found by tests). | `backend/routes/employees.js:57-65` | Both sides are updated on create/update/delete. | Fixed |
| M3 | Employee self-service could not be constrained: role escalation via `role: "admin"` on create. | `backend/routes/employees.js:9,16` | Only `order_booker` / `delivery_boy` are accepted; admin accounts cannot be edited or deactivated via this route. | Fixed |
| M4 | Client could send arbitrarily large photos/JSON. | `backend/server.js:31` | JSON limit 10 MB; `isImageDataUri` caps data-URI length at 9 MB and only allows jpeg/jpg/png/webp. | Fixed |
| M5 | Frontend SSE used a relative `/api/sse` URL, so real-time alerts broke when the frontend/backend are on different origins. | `frontend/src/pages/admin/AlertsPage.jsx:36` | `getSseUrl()` derives the URL from `VITE_API_URL` (`frontend/src/api/axios.js`). | Fixed |
| M6 | Service worker never precached the app shell and registered in dev, causing stale/broken caches. | `frontend/public/sw.js`, `frontend/src/main.jsx` | Rewritten: shell network-first + SPA fallback, hashed assets stale-while-revalidate, API never cached; registered only in production (`import.meta.env.PROD`). | Fixed |
| M7 | No PWA manifest/icons; mobile install produced a browser shortcut. | `frontend/index.html`, `frontend/public/manifest.json` | Manifest, theme meta, 192/512 icons, Apple touch icon. | Fixed |
| M8 | Corrupt/partial `localStorage` user JSON could crash the app at boot. | `frontend/src/context/AuthContext.jsx` | JSON parse is guarded; a half-written session is cleared. | Fixed |
| M9 | In-place `.sort()` mutated React state (`route.shops`). | `frontend/src/pages/admin/RouteManager.jsx`, `EmployeeHome.jsx` | Sort a copy (`[...route.shops]`). | Fixed |
| M10 | Reports CSV export crashed when an employee had been deleted (`r.employee.name`). | `frontend/src/pages/admin/ReportsPage.jsx:34-49` | Optional chaining + numeric fallbacks. | Fixed |
| M11 | MongoDB indexes required for production query patterns were missing. | `backend/models/*` | Added (see §2). | Fixed |
| M12 | `GET /api/health` reported only `"ok"`, with no DB signal. | `backend/server.js:105-112` | Returns `db: connected/disconnected/...` and a timestamp. | Fixed |
| M13 | No security headers / `x-powered-by` disclosure. | `backend/server.js:11,35-41` | `x-powered-by` disabled; `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. | Fixed |

### LOW

| # | Finding | Fix / decision | Status |
|---|---------|----------------|--------|
| L1 | React Leaflet 4 requires React 18 and blocked installs on React 19. | Removed unused `react-leaflet`; maps use plain Leaflet + Google Maps links. | Fixed |
| L2 | Error responses included raw `err.message` in many handlers. | Kept for this internal app (helps field support); the global handler returns a generic 500 message. | Accepted |
| L3 | Cloudinary delivery URLs are public by design. | Documented in `backend/utils/cloudinary.js:15-17`; use authenticated delivery + signed URLs if photos become sensitive. | Accepted |
| L4 | SSE is not reliable on Vercel serverless (response timeout). | Frontend polls every 15s as fallback (`AlertsPage.jsx:24-28`); documented in `backend/server.js:68-70`. | Accepted |
| L5 | No account lockout after repeated failed logins. | Rate limiting (20/min per IP) reduces brute force; add per-email lockout if required. | Accepted |
| L6 | `totalKm` in live tracking shows only the last completed session value until `/end`. | Live distance is derived from the GPS stream on the client; the odometer in the admin card is session total. | Accepted |

---

## 2. MongoDB indexes added

| Collection | Index | Purpose |
|------------|-------|---------|
| `users` | `{ email: 1 }` unique | login / duplicate prevention |
| `users` | `{ employeeId: 1 }` unique sparse | public employee id |
| `users` | `{ role: 1, isActive: 1 }` | admin/employee lists |
| `attendance` | `{ employee: 1, date: 1 }` unique | one attendance/day + race safety |
| `daysessions` | `{ employee: 1, date: 1 }` unique | one session/day + race safety |
| `daysessions` | `{ date: 1, status: 1 }` | live tracking / dashboard |
| `locationlogs` | `{ session: 1 }` unique | one log/session |
| `locationlogs` | `{ employee: 1, date: 1 }` | per-employee history |
| `shopcheckins` | `{ employee: 1, shop: 1, date: 1 }` unique | one visit/shop/day |
| `shopcheckins` | `{ session: 1 }` | live "shops done" count |
| `alerts` | `{ employee: 1, timestamp: -1 }` | alert feed |
| `alerts` | `{ isRead: 1, date: 1 }` | unread badges/dashboard |
| `alerts` | `{ employee: 1, session: 1, type: 1, timestamp: -1 }` | 5-min deviation dedup |
| `routes` | `{ assignedTo: 1, routeDate: 1, isActive: 1 }` | employee "my route" |
| `shops` | `{ isActive: 1, area: 1, name: 1 }` | shop list sort/filter |
| `settings` | `{ key: 1 }` unique | petrol price / setup lock |

> Mongoose builds these automatically on startup (`autoIndex` defaults to true). For an existing production database, run `syncIndexes()` once during a maintenance window.

---

## 3. Verification performed

| Check | Result |
|-------|--------|
| Backend `npm test` | **86 tests / 11 suites passed** (unit + Supertest integration on `mongodb-memory-server`) |
| Backend `npm run test:coverage` | **86.17% lines, 83.65% functions** (threshold 80%) |
| Frontend `npm run test:coverage` | **38 tests / 5 files passed; 91.75% lines, 88.23% functions** |
| Frontend `npm run build` | Production bundle built successfully (Vite 5) |
| `node --check` | All backend source files parse |
| Secrets | No `.env` file is committed; only `.env.example` files are tracked |

---

## 4. Residual risks / recommended next steps

1. **Deployment credentials** — GitHub/Vercel/Atlas/Cloudinary could not be configured from this environment (no CLIs or tokens). See `docs/DEPLOYMENT.md`.
2. **Cloudinary privacy** — photos are public URLs. Use authenticated delivery if this becomes a compliance requirement.
3. **SSE on Vercel** — use polling (already implemented) or move real-time alerts to a WebSocket/Pusher service.
4. **Refresh tokens** — JWTs last 7 days. Consider short-lived access tokens + refresh rotation for a larger workforce.
5. **Audit log** — admin edits (employee deactivate, route reassignment) are not logged. Add an `AuditLog` collection if accountability is required.
6. **Backups** — enable Atlas continuous backups before onboarding real field data.
