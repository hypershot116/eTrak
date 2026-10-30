import { categorySchema, type Category } from '@etrak/shared';

import { getDb, getDeviceId, newId } from './client';

type Row = {
  id: string;
  name: string;
  emoji: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
};

const fromRow = (r: Row): Category =>
  categorySchema.parse({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    deviceId: r.device_id,
  });

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
  );
  return rows.map(fromRow);
}

export async function createCategory(name: string, emoji: string): Promise<Category> {
  const db = await getDb();
  const now = Date.now();
  const category = categorySchema.parse({
    id: newId(),
    name,
    emoji,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deviceId: await getDeviceId(),
  });
  await db.runAsync(
    'INSERT INTO categories (id, name, emoji, created_at, updated_at, deleted_at, device_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    category.id,
    category.name,
    category.emoji,
    category.createdAt,
    category.updatedAt,
    null,
    category.deviceId
  );
  return category;
}

const defaults: [string, string][] = [
  ['Food', '🍔'],
  ['Transport', '🚌'],
  ['Shopping', '🛍️'],
  ['Bills', '🧾'],
  ['Health', '💊'],
  ['Fun', '🎬'],
];

// Adds starter categories the first time the app runs.
export async function ensureDefaultCategories() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if ((row?.n ?? 0) > 0) return;
  for (const [name, emoji] of defaults) {
    await createCategory(name, emoji);
  }
}
