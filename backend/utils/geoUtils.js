const getDistance = (lat1, lng1, lat2, lng2) => {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getMinDistFromRoute = (lat, lng, points) => {
  if (!points || points.length === 0) return 0;
  return Math.min(...points.map(p => getDistance(lat, lng, p.lat, p.lng)));
};

// Deviation zones:
//   0-500m   → ok
//   500-600m → warning  (gali/traffic)
//   600m+    → alert    (boss ko notify karo)
const getDeviationLevel = (meters) => {
  if (meters <= 500) return "ok";
  if (meters <= 600) return "warning";
  return "alert";
};

// Reverse geocoding — Nominatim (free, no API key)
const getAreaName = async (lat, lng) => {
  try {
    const fetch = require("node-fetch");
    const url   = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lng=${lng}&format=json&zoom=14`;
    const res   = await fetch(url, {
      headers: { "User-Agent": "FieldForce/1.0 (distribution-app)" },
      timeout: 3000
    });
    if (!res.ok) return "";
    const data  = await res.json();
    return data.address?.suburb
        || data.address?.neighbourhood
        || data.address?.city_district
        || data.address?.town
        || "";
  } catch {
    return "";
  }
};

module.exports = { getDistance, getMinDistFromRoute, getDeviationLevel, getAreaName };
