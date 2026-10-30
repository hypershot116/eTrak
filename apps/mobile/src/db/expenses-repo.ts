import { expenseSchema, type Expense } from '@etrak/shared';

import { getDb, getDeviceId, newId } from './client';

type Row = {
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

const fromRow = (r: Row): Expense =>
  expenseSchema.parse({
    id: r.id,
    amountMinor: r.amount_minor,
    currency: r.currency,
    rateToMain: r.rate_to_main,
    categoryId: r.category_id,
    note: r.note,
    spentAt: r.spent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    deviceId: r.device_id,
  });

export type NewExpense = {
  amountMinor: number; // 1250 = 12.50
  currency: string; // e.g. "USD"
  categoryId: string;
  note?: string;
  spentAt?: number; // epoch ms, defaults to now
  rateToMain?: number; // defaults to 1
};

export async function createExpense(input: NewExpense): Promise<Expense> {
  const db = await getDb();
  const now = Date.now();
  const e = expenseSchema.parse({
    id: newId(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    rateToMain: input.rateToMain ?? 1,
    categoryId: input.categoryId,
    note: input.note ?? '',
    spentAt: input.spentAt ?? now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deviceId: await getDeviceId(),
  });
  await db.runAsync(
    `INSERT INTO expenses (id, amount_minor, currency, rate_to_main, category_id, note, spent_at, created_at, updated_at, deleted_at, device_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.id,
    e.amountMinor,
    e.currency,
    e.rateToMain,
    e.categoryId,
    e.note,
    e.spentAt,
    e.createdAt,
    e.updatedAt,
    null,
    e.deviceId
  );
  return e;
}

export async function listExpenses(limit = 50): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM expenses WHERE deleted_at IS NULL ORDER BY spent_at DESC LIMIT ?',
    limit
  );
  return rows.map(fromRow);
}

// Soft delete: the row stays, marked as deleted, so other devices can learn about it later.
export async function softDeleteExpense(id: string) {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ?, device_id = ? WHERE id = ?',
    now,
    now,
    await getDeviceId(),
    id
  );
}
