import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { migrate } from './migrations';

// One connection per browser tab. On web only one connection to the file is
// allowed, so the promise is kept on globalThis and survives hot reloads.
const g = globalThis as unknown as { __etrakDb?: Promise<SQLiteDatabase> };

export function getDb(): Promise<SQLiteDatabase> {
  if (!g.__etrakDb) {
    g.__etrakDb = (async () => {
      try {
        const db = await openDatabaseAsync('etrak.db');
        await migrate(db);
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
