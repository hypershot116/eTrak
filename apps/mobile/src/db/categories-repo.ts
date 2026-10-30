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

// includeDeleted = true is for looking up names of old expenses whose category was removed.
export async function listCategories(includeDeleted = false): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    includeDeleted
      ? 'SELECT * FROM categories ORDER BY name'
      : 'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name'
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

// Rename a category or change its emoji. Bumps updatedAt/deviceId for sync.
export async function updateCategory(
  id: string,
  changes: { name: string; emoji: string }
): Promise<Category> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    'SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL',
    id
  );
  if (!row) throw new Error('Category not found');
  const category = categorySchema.parse({
    ...fromRow(row),
    ...changes,
    updatedAt: Date.now(),
    deviceId: await getDeviceId(),
  });
  await db.runAsync(
    'UPDATE categories SET name = ?, emoji = ?, updated_at = ?, device_id = ? WHERE id = ?',
    category.name,
    category.emoji,
    category.updatedAt,
    category.deviceId,
    id
  );
  return category;
}

// Soft delete: old expenses keep their category for history and reports.
export async function softDeleteCategory(id: string) {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    'UPDATE categories SET deleted_at = ?, updated_at = ?, device_id = ? WHERE id = ?',
    now,
    now,
    await getDeviceId(),
    id
  );
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
