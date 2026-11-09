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
      ? 'SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC'
      : 'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC'
  );
  return rows.map(fromRow);
}

export async function createCategory(name: string, emoji = ''): Promise<Category> {
  const db = await getDb();
  const cleanName = name.trim();
  const now = Date.now();
  const category = categorySchema.parse({
    id: newId(),
    name: cleanName,
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
    name: changes.name.trim(),
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

// Soft delete: user can delete any category, old expenses keep categoryId for history.
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

let ensurePromise: Promise<void> | null = null;

// Merges duplicate categories with the same name, reassigning expenses to the original
async function deduplicateCategories() {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY created_at ASC'
  );

  const seen = new Map<string, string>(); // lowerName -> canonicalId
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    const canonical = seen.get(key);
    if (!canonical) {
      seen.set(key, r.id);
    } else {
      // Re-assign any expenses referencing the duplicate to canonical ID
      await db.runAsync('UPDATE expenses SET category_id = ? WHERE category_id = ?', canonical, r.id);
      // Delete the duplicate category row
      await db.runAsync('DELETE FROM categories WHERE id = ?', r.id);
    }
  }
}

// Adds starter categories the first time the app runs and deduplicates existing ones
export async function ensureDefaultCategories(): Promise<void> {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      const db = await getDb();

      // Clean up any historical duplicate entries first
      await deduplicateCategories();

      // Check existing category names (including deleted) to prevent re-seeding
      const existing = await db.getAllAsync<{ name: string }>(
        'SELECT name FROM categories'
      );
      const existingNames = new Set(existing.map((e) => e.name.trim().toLowerCase()));

      for (const [name, emoji] of defaults) {
        if (!existingNames.has(name.toLowerCase())) {
          await createCategory(name, emoji);
          existingNames.add(name.toLowerCase());
        }
      }
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
