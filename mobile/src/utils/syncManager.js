// ================================================================
// SYNC MANAGER — offline actions ko server pe bhejta hai
// Web wale syncManager ka port — same logic:
//   Pass 1: TRACKING_START pehle (fake id -> real id mapping)
//   Pass 2: baaki sab order mein
// ================================================================
import { api } from "../api/client";
import { getPending, deleteAction, updateAction } from "./offlineQueue";

const MAX_ATTEMPTS = 5;
const FAKE_SESSION_PREFIX = "offline_";

const isFakeSession = (id) =>
  typeof id === "string" && id.startsWith(FAKE_SESSION_PREFIX);

const statusOf = (res) => res?.status;

const isAuthError = (res) => statusOf(res) === 401;

// Network errors, rate limits and server errors are retryable. They must never
// delete queued field work.
const isRetryable = (res) => {
  const status = statusOf(res);
  return !status || status === 408 || status === 429 || status >= 500;
};

const isPermanent = (res) => {
  const status = statusOf(res);
  return status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
};

const processAction = async (action) => {
  switch (action.type) {
    case "ATTENDANCE_CHECKIN":
      return api.markAttendance("checkin", action.photo, action.location);
    case "ATTENDANCE_CHECKOUT":
      return api.markAttendance("checkout", action.photo, action.location);
    case "TRACKING_START":
      return api.startTracking(action.location);
    case "TRACKING_UPDATE":
      return api.updateTracking(action.sessionId, action.lat, action.lng, action.accuracy);
    case "TRACKING_END":
      return api.endTracking(action.sessionId, action.location);
    case "SHOP_CHECKIN":
      return api.shopCheckin({
        shopId: action.shopId,
        sessionId: action.sessionId,
        routeId: action.routeId,
        photo: action.photo,
        location: action.location
      });
    default:
      return { ok: false, status: 400, data: { message: `Unknown action: ${action.type}` } };
  }
};

const markAttempt = async (action, res) => {
  const attempts = (action.attempts || 0) + 1;
  await updateAction(action.id, {
    attempts,
    lastError: res?.data?.message || "Unknown error",
    lastAttemptAt: Date.now()
  });
  return attempts;
};

export const syncPendingActions = async (onProgress) => {
  const initial = await getPending();
  if (initial.length === 0) return { synced: 0, failed: 0, total: 0, deferred: 0 };

  let synced = 0, failed = 0, deferred = 0;
  let authError = false;
  const sessionMap = new Map(); // offline_x -> real ObjectId

  const report = () => onProgress?.({ synced, failed, deferred, total: initial.length });

  // ── Pass 1: start sessions first so every later action can be remapped ──
  const fakeIds = new Set(initial.filter(a => isFakeSession(a.sessionId)).map(a => String(a.sessionId)));
  const starts  = initial.filter(a => a.type === "TRACKING_START");

  for (const start of starts) {
    try {
      const res = await processAction(start);
      const realId = res?.ok && res.data?._id ? String(res.data._id) : null;

      if (realId) {
        const oldId = start.offlineSessionId
          ? String(start.offlineSessionId)
          : (fakeIds.size === 1 ? [...fakeIds][0] : null);

        if (oldId) {
          sessionMap.set(oldId, realId);
          // Persist the mapping so an interrupted sync resumes correctly.
          const rest = await getPending();
          for (const action of rest) {
            if (String(action.sessionId) === oldId) {
              await updateAction(action.id, { sessionId: realId });
            }
          }
        }
      }

      await deleteAction(start.id);
      synced++;
      report();
    } catch (err) {
      failed++;
      report();
    }
  }

  if (authError) {
    return { synced, failed, total: initial.length, deferred, authError };
  }

  // ── Pass 2: everything else, in queue order ─────────────────
  const pending = await getPending();

  for (const action of pending) {
    if (action.type === "TRACKING_START") continue; // handled in pass 1

    try {
      let sessionId = action.sessionId;

      if (isFakeSession(sessionId)) {
        const mapped = sessionMap.get(String(sessionId));
        if (!mapped) {
          // Start has not synced yet — keep the action for the next attempt.
          deferred++;
          await markAttempt(action, new Error("Session not synced yet"));
          report();
          continue;
        }
        sessionId = mapped;
        await updateAction(action.id, { sessionId });
      }

      const res = await processAction({ ...action, sessionId });
      if (isAuthError(res)) { authError = true; break; }
      if (res.ok) {
        await deleteAction(action.id);
        synced++;
      } else if (isPermanent(res)) {
        const attempts = await markAttempt(action, res);
        if (attempts >= MAX_ATTEMPTS) await deleteAction(action.id);
        failed++;
      } else {
        await markAttempt(action, res);
        failed++;
      }
      report();
    } catch (err) {
      failed++;
      report();
    }
  }

  return { synced, failed, total: initial.length, deferred, authError };
};
