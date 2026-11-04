// ================================================================
// NATIVE WRAPPER — Kotlin MockLocationDetectorModule ko call karta
// hai. Agar native module missing hai (web/junk build), safe
// fallback return karta hai.
// ================================================================
import { NativeModules } from "react-native";

const { MockLocationDetector } = NativeModules;

// Report 60s cache — har tick pe native scan mehnga hai
let cachedReport = null;
let cacheTime = 0;
const CACHE_MS = 60 * 1000;

export const getOsReport = async (force = false) => {
  if (!MockLocationDetector?.getFullReport) {
    return { available: false, shouldBlock: false, blockers: [] };
  }
  try {
    if (!force && cachedReport && Date.now() - cacheTime < CACHE_MS) {
      return { available: true, ...cachedReport };
    }
    const report = await MockLocationDetector.getFullReport();
    cachedReport = report;
    cacheTime = Date.now();
    return { available: true, ...report };
  } catch {
    return { available: false, shouldBlock: false, blockers: [] };
  }
};

export const resetOsCache = () => { cachedReport = null; cacheTime = 0; };

export const isLastLocationMocked = async () => {
  if (!MockLocationDetector?.isLastLocationMocked) return null;
  try {
    return await MockLocationDetector.isLastLocationMocked();
  } catch { return null; }
};

export const nativeAvailable = () =>
  !!MockLocationDetector?.getFullReport;
