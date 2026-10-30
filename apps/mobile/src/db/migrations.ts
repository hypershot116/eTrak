import type { SQLiteDatabase } from 'expo-sqlite';

// Each entry is one version of the database. Never edit old entries: add a new one.
const migrations: string[] = [
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    device_id TEXT NOT NULL
  );
  CREATE TABLE expenses (
    id TEXT PRIMARY KEY NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    rate_to_main REAL NOT NULL,
    category_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    spent_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    device_id TEXT NOT NULL
  );
  CREATE INDEX idx_expenses_spent_at ON expenses (spent_at);
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let i = current; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}
