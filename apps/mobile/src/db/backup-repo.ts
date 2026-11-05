import { categorySchema, expenseSchema } from '@etrak/shared';

import { getDb, getDeviceId } from './client';
import { getSetting, setSetting } from './settings-repo';

type CategoryRow = {
  id: string;
  name: string;
  emoji: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
};

type ExpenseRow = {
  id: string;
  amount_minor: number;
  currency: string;
  rate_to_main: number;
  category_id: string;
  note: string;
  spent_at: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: string;
};

export type Backup = {
  app: 'eTrak';
  version: 1;
  exportedAt: number;
  deviceId: string;
  categories: CategoryRow[];
  expenses: ExpenseRow[];
  settings: { main_currency?: string };
};

export async function exportBackup(): Promise<Backup> {
  const db = await getDb();
  const categories = await db.getAllAsync<CategoryRow>('SELECT * FROM categories');
  const expenses = await db.getAllAsync<ExpenseRow>('SELECT * FROM expenses');
  const main = await getSetting('main_currency');
  return {
    app: 'eTrak',
    version: 1,
    exportedAt: Date.now(),
    deviceId: await getDeviceId(),
    categories,
    expenses,
    settings: main ? { main_currency: main } : {},
  };
}

// Merges a backup into the local database. A record only changes if the incoming one is newer.
export async function mergeBackup(
  data: unknown
): Promise<{ changed: number; skipped: number; addedExpenses: number; addedCategories: number }> {
  const b = data as Partial<Backup> | null;
  if (!b || b.app !== 'eTrak' || !Array.isArray(b.categories) || !Array.isArray(b.expenses)) {
    throw new Error('The file in Google Drive is not an eTrak backup.');
  }
  const db = await getDb();
  let changed = 0;
  let skipped = 0;
  let addedExpenses = 0;
  let addedCategories = 0;
  const knownCategoryIds = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM categories')).map((r) => r.id)
  );
  const knownExpenseIds = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM expenses')).map((r) => r.id)
  );

  // A fresh browser creates its own starter categories. Remove the unused ones the backup also has.
  const nowMs = Date.now();
  for (const raw of b.categories as CategoryRow[]) {
    if (!raw || typeof raw.name !== 'string' || raw.deleted_at != null) continue;
    await db.runAsync(
      `UPDATE categories SET deleted_at = ?, updated_at = ?
       WHERE deleted_at IS NULL AND id != ? AND LOWER(name) = LOWER(?)
       AND NOT EXISTS (SELECT 1 FROM expenses WHERE expenses.category_id = categories.id AND expenses.deleted_at IS NULL)`,
      nowMs,
      nowMs,
      raw.id,
      raw.name
    );
  }

  for (const raw of b.categories as CategoryRow[]) {
    if (!raw || typeof raw !== 'object') {
      skipped++;
      continue;
    }
    const parsed = categorySchema.safeParse({
      id: raw.id,
      name: raw.name,
      emoji: raw.emoji,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      deletedAt: raw.deleted_at ?? null,
      deviceId: raw.device_id,
    });
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const c = parsed.data;
    const res = await db.runAsync(
      `INSERT INTO categories (id, name, emoji, created_at, updated_at, deleted_at, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, emoji = excluded.emoji,
         updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, device_id = excluded.device_id
       WHERE excluded.updated_at > categories.updated_at`,
      c.id,
      c.name,
      c.emoji,
      c.createdAt,
      c.updatedAt,
      c.deletedAt,
      c.deviceId
    );
    changed += res.changes;
    if (res.changes > 0 && c.deletedAt === null && !knownCategoryIds.has(c.id)) addedCategories++;
  }

  for (const raw of b.expenses as ExpenseRow[]) {
    if (!raw || typeof raw !== 'object') {
      skipped++;
      continue;
    }
    const parsed = expenseSchema.safeParse({
      id: raw.id,
      amountMinor: raw.amount_minor,
      currency: raw.currency,
      rateToMain: raw.rate_to_main,
      categoryId: raw.category_id,
      note: raw.note,
      spentAt: raw.spent_at,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      deletedAt: raw.deleted_at ?? null,
      deviceId: raw.device_id,
    });
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const e = parsed.data;
    const res = await db.runAsync(
      `INSERT INTO expenses (id, amount_minor, currency, rate_to_main, category_id, note, spent_at, created_at, updated_at, deleted_at, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET amount_minor = excluded.amount_minor, currency = excluded.currency,
         rate_to_main = excluded.rate_to_main, category_id = excluded.category_id, note = excluded.note,
         spent_at = excluded.spent_at, updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
         device_id = excluded.device_id
       WHERE excluded.updated_at > expenses.updated_at`,
      e.id,
      e.amountMinor,
      e.currency,
      e.rateToMain,
      e.categoryId,
      e.note,
      e.spentAt,
      e.createdAt,
      e.updatedAt,
      e.deletedAt,
      e.deviceId
    );
    changed += res.changes;
    if (res.changes > 0 && e.deletedAt === null && !knownExpenseIds.has(e.id)) addedExpenses++;
  }

  const main = b.settings?.main_currency;
  if (typeof main === 'string' && /^[A-Z]{3}$/.test(main) && !(await getSetting('main_currency'))) {
    await setSetting('main_currency', main);
  }

  return { changed, skipped, addedExpenses, addedCategories };
}

// Removes expenses and categories from this device only. Google Drive is not touched.
export async function eraseLocalData() {
  const db = await getDb();
  await db.execAsync('DELETE FROM expenses; DELETE FROM categories;');
  await db.runAsync("DELETE FROM settings WHERE key IN ('last_sync_at', 'main_currency', 'last_currency')");
}
