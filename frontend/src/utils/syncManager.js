import api from "../api/axios";
import { getPending, deleteAction } from "./offlineQueue";

export const syncPendingActions = async (onProgress) => {
  const pending = await getPending();
  if (pending.length === 0) return { synced: 0, failed: 0, total: 0 };

  let synced = 0, failed = 0;

  for (const action of pending) {
    try {
      await processAction(action);
      await deleteAction(action.id);
      synced++;
      onProgress?.({ synced, failed, total: pending.length });
    } catch (err) {
      console.error("Sync failed:", action.type, err.message);
      if (err.response?.status >= 400 && err.response?.status < 500) {
        await deleteAction(action.id); // permanent error — delete karo
      }
      failed++;
    }
  }
  return { synced, failed, total: pending.length };
};

const processAction = async (action) => {
  switch (action.type) {
    case "ATTENDANCE_CHECKIN":
      return api.post("/attendance/mark", { type: "checkin", photo: action.photo, location: action.location });
    case "ATTENDANCE_CHECKOUT":
      return api.post("/attendance/mark", { type: "checkout", photo: action.photo, location: action.location });
    case "TRACKING_START":
      return api.post("/tracking/start", { location: action.location });
    case "TRACKING_UPDATE":
      return api.post("/tracking/update", { lat: action.lat, lng: action.lng, sessionId: action.sessionId });
    case "TRACKING_END":
      return api.post("/tracking/end", { sessionId: action.sessionId, location: action.location });
    case "SHOP_CHECKIN":
      return api.post("/checkin", { shopId: action.shopId, sessionId: action.sessionId, routeId: action.routeId, photo: action.photo, location: action.location });
    default:
      throw new Error(`Unknown: ${action.type}`);
  }
};
