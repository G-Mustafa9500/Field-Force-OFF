// ================================================================
// BACKEND CONFIG
// ================================================================
// LIVE (Vercel) backend — APK kahin bhi chale, kisi bhi network pe.
// Agar Vercel URL abhi set nahi hua to local fallback chalega.
//
// Login screen ke "Advanced" mein user apna server URL bhi dal sakta
// hai (local testing ke liye) — wo AsyncStorage pe save hota hai.
// ================================================================

// Vercel backend — LIVE DEPLOYED ✅
export const LIVE_API_URL = "https://field-force-api.vercel.app/api";

// Local fallback (PC + phone same WiFi)
export const LOCAL_API_URL = "http://10.1.9.151:5000/api";

// Default: LIVE. Login screen override AsyncStorage mein "ff_server_url"
export const DEFAULT_API_URL = LIVE_API_URL;

// Tracking GPS update interval (seconds)
export const GPS_UPDATE_INTERVAL = 15;

// Speed threshold — bike rider never crosses this realistically
export const MAX_SPEED_KMH = 200;
