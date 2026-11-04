// ================================================================
// FAKE LOCATION DETECTOR — RN Version (6 Layer)
// ================================================================
// Layer 1: OS mock provider flag (react-native-geolocation-service
//          position.mocked + native fallback)
// Layer 2: OS AppOps report — mock grant / fake app / root
// Layer 3: Accuracy analysis (0 / 1 / >5000)
// Layer 4: Speed/teleport detection (>200 km/h + >1km jump)
// Layer 5: Static lock (5 exact same coords)
// Layer 6: Timestamp mismatch (spoofer apps purani timestamps)
// ================================================================
import { getOsReport } from "../native/MockLocationDetector";
import { MAX_SPEED_KMH } from "../config";

// ── Haversine distance ────────────────────────────────────────
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Session state ─────────────────────────────────────────────
let lastRealPosition = null;
let lastTimestamp = null;
let positionHistory = [];
let osReport = null; // HomeScreen pehle getOsStatusOnStart() se set karta hai

export const setOsReport = (report) => { osReport = report; };

export const getOsStatusOnStart = async () => {
  const rep = await getOsReport(true);
  osReport = rep;
  return rep;
};

// ── THE DETECTOR ──────────────────────────────────────────────
export const detectFakeLocation = (position) => {
  const { latitude: lat, longitude: lng, accuracy,
          altitude, altitudeAccuracy } = position.coords || {};
  const timestamp = position.timestamp || Date.now();
  const reasons = [];
  let speedKmh = 0;

  // ── Layer 1: OS mock provider flag ─────────────────────────
  // react-native-geolocation-service `.mocked` field deta hai
  if (position.mocked === true) {
    reasons.push("OS mock provider flag — location spoofed hai");
  }

  // ── Layer 2: OS AppOps report ──────────────────────────────
  if (osReport?.available) {
    if (osReport.mockGranted) {
      reasons.push(
        `Mock location grant active: ${osReport.mockGrantedPackage}`
      );
    }
    if (osReport.rooted) {
      reasons.push("Rooted device detected");
    }
  }

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    // ── Layer 3: Accuracy ────────────────────────────────────
    if (accuracy === 0) reasons.push("Accuracy = 0 — fake GPS app");
    else if (accuracy === 1) reasons.push("Accuracy = 1 — fake GPS app");
    else if (accuracy > 5000) reasons.push("Accuracy bohot kharab — suspicious");

    // Altitude anomaly (fake apps 0/0 bhejti hain)
    if (altitude === 0 && altitudeAccuracy === 0 && accuracy === 0) {
      reasons.push("Altitude anomaly — fake GPS suspected");
    }

    // ── Layer 4: Speed/teleport ─────────────────────────────
    if (lastRealPosition && lastTimestamp) {
      const distKm = getDistanceMeters(
        lastRealPosition.lat, lastRealPosition.lng, lat, lng
      ) / 1000;
      const timeSec = (timestamp - lastTimestamp) / 1000;
      speedKmh = timeSec > 0 ? Math.round(distKm / (timeSec / 3600)) : 0;

      if (speedKmh > MAX_SPEED_KMH && distKm > 1) {
        reasons.push(
          `Speed ${Math.round(speedKmh)} km/h — teleport detected`
        );
      }
    }

    // ── Layer 5: Static lock ────────────────────────────────
    positionHistory.push({ lat, lng });
    if (positionHistory.length > 10) positionHistory = positionHistory.slice(-10);
    if (positionHistory.length >= 5) {
      const allSame = positionHistory.every(p =>
        p.lat === positionHistory[0].lat &&
        p.lng === positionHistory[0].lng
      );
      if (allSame) {
        reasons.push("Location bilkul static hai — fake GPS suspected");
      }
    }
  }

  // ── Layer 6: Timestamp mismatch ───────────────────────────
  const tsDrift = Date.now() - timestamp;
  if (Math.abs(tsDrift) > 120 * 1000) {
    reasons.push(`Timestamp drift ${Math.round(tsDrift / 1000)}s — spoofer likely`);
  }

  const isFake = reasons.length > 0;

  // Real position save (next speed check ke liye)
  if (!isFake) {
    lastRealPosition = { lat, lng };
    lastTimestamp = timestamp;
  }

  return {
    isFake,
    reasons: reasons.slice(0, 5),
    confidence: reasons.length === 0 ? "REAL" :
                reasons.length === 1 ? "SUSPICIOUS" : "FAKE",
    accuracy,
    speed: speedKmh,
    realLat: lat,
    realLng: lng,
    flagCount: reasons.length
  };
};

export const resetDetector = () => {
  lastRealPosition = null;
  lastTimestamp = null;
  positionHistory = [];
};
