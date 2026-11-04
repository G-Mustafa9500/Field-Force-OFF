// ================================================================
// DATE UTILS — company timezone "today" (YYYY-MM-DD)
// Web wale date.js ka port. toISOString() bug avoid karo:
// Pakistan 00:00-05:00 ke beech wo yesterday deta hai.
// ================================================================
export const DEFAULT_TIMEZONE = "Asia/Karachi";

export const getDateString = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const get = (type) => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const todayStr = (timeZone = DEFAULT_TIMEZONE) => getDateString(new Date(), timeZone);

// N din pehle (YYYY-MM-DD)
export const daysAgoStr = (n, timeZone = DEFAULT_TIMEZONE) =>
  getDateString(new Date(Date.now() - n * 86400000), timeZone);

// Time format (en-PK style: "02:30 PM")
export const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
  : "";

// Date format ("4 Nov 2026")
export const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
  : "";

// Haversine distance (km) — web EmployeeHome wala same
export const distKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
