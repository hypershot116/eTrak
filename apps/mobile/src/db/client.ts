import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { migrate } from './migrations';

// One connection per browser tab. On web only one connection to the file is
// allowed, so the promise is kept on globalThis and survives hot reloads.
type ChangeBus = { listeners: Set<() => void>; suppressed: number };
const g = globalThis as unknown as {
  __etrakDb?: Promise<SQLiteDatabase>;
  __etrakChange?: ChangeBus;
};
const bus: ChangeBus = (g.__etrakChange ??= { listeners: new Set(), suppressed: 0 });

// Called whenever expenses, categories or the main currency are written.
export function onDataChanged(listener: () => void): () => void {
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}

// Runs fn without announcing changes (used while a sync writes data it just downloaded).
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

// Wraps runAsync so every write to expenses/categories/main currency announces itself once.
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
        if (touchesData || touchesMainCurrency) bus.listeners.forEach((l) => l());
      }
      return result;
    };
    target.__etrakWatched = true;
  } catch {
    // If this fails, auto-sync still runs on its 2-minute timer.
  }
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!g.__etrakDb) {
    g.__etrakDb = (async () => {
      try {
        const db = await openDatabaseAsync('etrak.db');
        await migrate(db);
        watchWrites(db);
        return db;
      } catch (e) {
        g.__etrakDb = undefined; // allow a retry after a failure
        throw e;
      }
    })();
  }
  return g.__etrakDb;
}

export const newId = () => randomUUID();

// Each installation gets a permanent random ID (needed later for multi-device sync).
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
