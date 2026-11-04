// ================================================================
// OFFLINE QUEUE — AsyncStorage port (web IndexedDB se)
// Har action { id, type, ..., queuedAt, attempts } format mein save
// ================================================================
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ff_offline_queue";

const readAll = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const writeAll = async (actions) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(actions));
};

export const queueAction = async (action) => {
  const actions = await readAll();
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = { ...action, id, queuedAt: Date.now(), attempts: 0 };
  actions.push(entry);
  await writeAll(actions);
  return entry;
};

export const getPending = async () => readAll();

export const getPendingCount = async () => {
  try { return (await readAll()).length; } catch { return 0; }
};

export const updateAction = async (id, patch) => {
  const actions = await readAll();
  const idx = actions.findIndex(a => a.id === id);
  if (idx === -1) return null;
  actions[idx] = { ...actions[idx], ...patch, id };
  await writeAll(actions);
  return actions[idx];
};

export const deleteAction = async (id) => {
  const actions = await readAll();
  await writeAll(actions.filter(a => a.id !== id));
};

// "Clear all" recovery UI ke liye
export const clearQueue = async () => {
  await AsyncStorage.removeItem(KEY);
};
