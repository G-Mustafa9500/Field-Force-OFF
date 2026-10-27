const DB_NAME = "FieldForceOffline";
const STORE   = "pendingActions";
let db = null;

const openDB = () => new Promise((resolve, reject) => {
  if (db) return resolve(db);
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = e => {
    if (!e.target.result.objectStoreNames.contains(STORE))
      e.target.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
  };
  req.onsuccess = e => { db = e.target.result; resolve(db); };
  req.onerror   = () => reject(req.error);
});

export const queueAction = async (action) => {
  const d = await openDB();
  return new Promise((res, rej) => {
    const req = d.transaction(STORE, "readwrite").objectStore(STORE).add({ ...action, queuedAt: Date.now() });
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
};

export const getPending = async () => {
  const d = await openDB();
  return new Promise((res, rej) => {
    const req = d.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
};

export const deleteAction = async (id) => {
  const d = await openDB();
  return new Promise((res, rej) => {
    const req = d.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
};

export const getPendingCount = async () => {
  try { return (await getPending()).length; } catch { return 0; }
};
