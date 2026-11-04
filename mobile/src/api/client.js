// ================================================================
// API CLIENT — web app ke same backend ko hit karta hai
// Token AsyncStorage pe save, har request mein Authorization header
// Server URL override support (login advanced / settings)
// ================================================================
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_API_URL } from "../config";

let authToken = null;
let baseURL = DEFAULT_API_URL;

// ── Server URL (override support) ────────────────────────────
export const initServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem("ff_server_url");
    if (saved) baseURL = saved.replace(/\/+$/, "");
  } catch { /* default */ }
  return baseURL;
};

export const getServerUrl = () => baseURL;

export const setServerUrl = async (url) => {
  baseURL = (url || DEFAULT_API_URL).trim().replace(/\/+$/, "");
  // /api suffix ensure karo (agar user ne sirf domain dala)
  if (!/\/api$/.test(baseURL)) baseURL = `${baseURL}/api`;
  await AsyncStorage.setItem("ff_server_url", baseURL);
};

// ── Auth token ───────────────────────────────────────────────
export const initAuth = async () => {
  try {
    authToken = await AsyncStorage.getItem("ff_token");
    return authToken;
  } catch { return null; }
};

export const setToken = async (token) => {
  authToken = token;
  if (token) await AsyncStorage.setItem("ff_token", token);
  else await AsyncStorage.removeItem("ff_token");
};

// ── Core request ─────────────────────────────────────────────
const request = async (method, path, body = null, opts = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${baseURL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    // Network error — server unreachable
    return { ok: false, status: 0, data: { message: "Server se connection nahi" }, networkError: true };
  }

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (res.status === 401 && !opts.noAuthRedirect) {
    // Token expire — logout karo
    await setToken(null);
    await AsyncStorage.removeItem("ff_user").catch(() => {});
    data = data || {};
    data.sessionExpired = true;
    return { ok: false, status: 401, data };
  }

  return { ok: res.ok, status: res.status, data };
};

const get = (path, opts) => request("GET", path, null, opts);
const post = (path, body, opts) => request("POST", path, body, opts);
const put = (path, body, opts) => request("PUT", path, body, opts);
const del = (path, opts) => request("DELETE", path, null, opts);

// ── API — web app ke saare endpoints ─────────────────────────
export const api = {
  // Auth
  login: (email, password) => post("/auth/login", { email, password }, { noAuthRedirect: true }),
  needsSetup: () => get("/auth/needs-setup", { noAuthRedirect: true }),
  setup: (form) => post("/auth/setup", form, { noAuthRedirect: true }),
  me: () => get("/auth/me"),

  // Tracking
  startTracking: (location) => post("/tracking/start", { location }),
  updateTracking: (sessionId, lat, lng, accuracy, speed) =>
    post("/tracking/update", { sessionId, lat, lng, accuracy, speed }),
  endTracking: (sessionId, location) => post("/tracking/end", { sessionId, location }),
  activeTracking: () => get("/tracking/active"),
  liveTracking: () => get("/tracking/live"),
  trackingSessions: (date) => get(`/tracking/sessions?date=${date}`),
  trackingLogs: (sessionId) => get(`/tracking/logs/${sessionId}`),

  // Attendance
  markAttendance: (type, photo, location) => post("/attendance/mark", { type, photo, location }),
  todayAttendance: () => get("/attendance/today"),
  attendanceList: (date) => get(`/attendance?date=${date}`),

  // Check-in (shops)
  shopCheckin: (payload) => post("/checkin", payload),
  todayCheckins: () => get("/checkin/today"),
  checkinList: (date) => get(`/checkin?date=${date}`),

  // Fake location
  reportFakeLocation: (payload) => post("/fake-location/report", payload),

  // Employees (admin)
  employees: () => get("/employees"),
  createEmployee: (payload) => post("/employees", payload),
  updateEmployee: (id, payload) => put(`/employees/${id}`, payload),
  deleteEmployee: (id) => del(`/employees/${id}`),

  // Shops
  shops: () => get("/shops"),
  createShop: (payload) => post("/shops", payload),
  updateShop: (id, payload) => put(`/shops/${id}`, payload),
  deleteShop: (id) => del(`/shops/${id}`),

  // Routes
  routes: (date) => get(`/routes?date=${date}`),
  myRoute: () => get("/routes/my"),
  createRoute: (payload) => post("/routes", payload),
  updateRoute: (id, payload) => put(`/routes/${id}`, payload),
  deleteRoute: (id) => del(`/routes/${id}`),

  // Alerts
  alerts: (params = "") => get(`/alerts${params}`),
  alertCount: () => get("/alerts/count"),
  markAlertRead: (id) => put(`/alerts/${id}/read`),
  markAllAlertsRead: () => put("/alerts/read-all"),

  // Settings
  getSettings: () => get("/settings"),
  updateSettings: (payload) => put("/settings", payload),

  // Reports
  reportSummary: () => get("/reports/summary"),
  reportFuel: (startDate, endDate) => get(`/reports/fuel?startDate=${startDate}&endDate=${endDate}`),
  reportCheckins: (date) => get(`/reports/checkins?date=${date}`),
};
