import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { migrate } from './migrations';

type ChangeBus = { listeners: Set<() => void>; suppressed: number };
const g = globalThis as unknown as {
  __etrakDb?: Promise<SQLiteDatabase>;
  __etrakChange?: ChangeBus;
};
const bus: ChangeBus = (g.__etrakChange ??= { listeners: new Set(), suppressed: 0 });

let crossTabChannel: BroadcastChannel | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    crossTabChannel = new BroadcastChannel('etrak_db_channel');
    crossTabChannel.onmessage = (event) => {
      if (event.data?.type === 'DATA_CHANGED' && bus.suppressed === 0) {
        bus.listeners.forEach((l) => l());
      }
    };
  } catch {}
}

export function onDataChanged(listener: () => void): () => void {
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}

export async function withoutChangeEvents<T>(fn: () => Promise<T>): Promise<T> {
  bus.suppressed++;
  try {
    return await fn();
  } finally {
    bus.suppressed--;
  }
}

type AnyFn = (...args: unknown[]) => Promise<unknown>;
const WRITE = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;

function notifyDataChanged() {
  bus.listeners.forEach((l) => l());
  if (crossTabChannel) {
    try {
      crossTabChannel.postMessage({ type: 'DATA_CHANGED', timestamp: Date.now() });
    } catch {}
  }
}

function watchWrites(db: SQLiteDatabase) {
  const target = db as unknown as { runAsync: AnyFn; __etrakWatched?: boolean };
  if (target.__etrakWatched) return;
  try {
    const original = target.runAsync.bind(db);
    target.runAsync = async (...args: unknown[]) => {
      const result = await original(...args);
      const sql = typeof args[0] === 'string' ? args[0] : '';
      if (WRITE.test(sql) && bus.suppressed === 0) {
        const touchesData = /\b(expenses|categories)\b/i.test(sql);
        const touchesMainCurrency =
          /\bsettings\b/i.test(sql) && JSON.stringify(args.slice(1)).includes('main_currency');
        if (touchesData || touchesMainCurrency) notifyDataChanged();
      }
      return result;
    };
    target.__etrakWatched = true;
  } catch {}
}

async function openWithRetry(name: string, retries = 5, delay = 200): Promise<SQLiteDatabase> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await openDatabaseAsync(name);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Invalid VFS state') || msg.includes('locked') || msg.includes('busy')) {
        await new Promise((r) => setTimeout(r, delay * attempt));
        continue;
      }
      throw err;
    }
  }

  // Fallback for Web multi-tab OPFS lock contention: open a non-colliding tab-scoped instance
  if (Platform.OS === 'web') {
    const tabFallback = `etrak_tab_${Math.random().toString(36).substring(2, 8)}.db`;
    return await openDatabaseAsync(tabFallback);
  }
  throw lastError;
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!g.__etrakDb) {
    g.__etrakDb = (async () => {
      try {
        const db = await openWithRetry('etrak.db');
        await migrate(db);
        watchWrites(db);
        return db;
      } catch (e) {
        g.__etrakDb = undefined;
        throw e;
      }
    })();
  }
  return g.__etrakDb;
}

export const newId = () => randomUUID();

let deviceId: string | null = null;
export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'device_id'"
  );
  if (row) {
    deviceId = row.value;
  } else {
    deviceId = newId();
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('device_id', ?)", deviceId);
  }
  return deviceId;
}
