import type { Category, Expense } from '@etrak/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DbErrorBanner } from '@/components/db-error-banner';
import { ExpenseSheet } from '@/components/expense-sheet';
import { ensureDefaultCategories, listCategories } from '@/db/categories-repo';
import { listExpensesInRange } from '@/db/expenses-repo';
import { dayLabel, monthLabel, monthRange, toDateInput } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

type Row =
  | { kind: 'day'; key: string; label: string; total: string }
  | { kind: 'expense'; key: string; expense: Expense };

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]); // active, for the sheet
  const [allCategories, setAllCategories] = useState<Category[]>([]); // incl. deleted, for names
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const isCurrentMonth = month.y === now.getFullYear() && month.m === now.getMonth();

  const refresh = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      setCategories(await listCategories());
      setAllCategories(await listCategories(true));
      const [start, end] = monthRange(month.y, month.m);
      setExpenses(await listExpensesInRange(start, end));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [month]);

  // Runs on first open, when the month changes, and when the user returns to this tab.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const categoryById = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );

  // Totals per currency (no conversion until exchange rates are added).
  const totals = useMemo(() => {
    const sums = new Map<string, number>();
    for (const e of expenses) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
    return [...sums.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  // Expenses are already newest first; add a header row whenever the day changes.
  const rows = useMemo<Row[]>(() => {
    const days = new Map<string, Expense[]>();
    for (const e of expenses) {
      const k = toDateInput(e.spentAt);
      const list = days.get(k) ?? [];
      list.push(e);
      days.set(k, list);
    }
    const out: Row[] = [];
    for (const [k, list] of days) {
      const sums = new Map<string, number>();
      for (const e of list) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
      out.push({
        kind: 'day',
        key: `day-${k}`,
        label: dayLabel(list[0].spentAt),
        total: [...sums.entries()].map(([c, n]) => formatMinor(n, c)).join(' · '),
      });
      for (const e of list) out.push({ kind: 'expense', key: e.id, expense: e });
    }
    return out;
  }, [expenses]);

  const shiftMonth = (delta: number) => {
    setMonth((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setSheetOpen(true);
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="w-full max-w-2xl flex-1 self-center px-5">
        <Text className="py-4 text-3xl font-bold text-accent">eTrak</Text>

        <DbErrorBanner error={error} />

        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => shiftMonth(-1)}
            className="h-10 w-10 items-center justify-center rounded-full bg-zinc-200 active:opacity-60 dark:bg-zinc-800"
          >
            <Text className="text-xl text-zinc-800 dark:text-zinc-200">‹</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
            {monthLabel(month.y, month.m)}
          </Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            className={`h-10 w-10 items-center justify-center rounded-full bg-zinc-200 active:opacity-60 dark:bg-zinc-800 ${
              isCurrentMonth ? 'opacity-30' : ''
            }`}
          >
            <Text className="text-xl text-zinc-800 dark:text-zinc-200">›</Text>
          </Pressable>
        </View>

        {totals.length > 0 ? (
          <View className="mb-2 gap-1 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
            <Text className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              Spent this month · {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
            {totals.map(([code, minor]) => (
              <Text key={code} className="text-2xl font-bold text-zinc-900 dark:text-white">
                {formatMinor(minor, code)}
              </Text>
            ))}
          </View>
        ) : null}

        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text className="pt-10 text-center text-zinc-500 dark:text-zinc-400">
              {isCurrentMonth
                ? 'No expenses yet this month. Tap + to add one.'
                : 'No expenses in this month.'}
            </Text>
          }
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return (
                <View className="flex-row items-baseline justify-between pb-1 pt-5">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {item.label}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">{item.total}</Text>
                </View>
              );
            }
            const e = item.expense;
            const cat = categoryById.get(e.categoryId);
            return (
              <Pressable
                onPress={() => openEdit(e)}
                className="flex-row items-center gap-3 border-b border-zinc-200 py-3 active:opacity-60 dark:border-zinc-800"
              >
                <Text className="text-2xl">{cat?.emoji ?? '❓'}</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {cat?.name ?? 'Unknown'}
                  </Text>
                  {e.note ? (
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{e.note}</Text>
                  ) : null}
                </View>
                <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatMinor(e.amountMinor, e.currency)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <Pressable
        onPress={openNew}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent"
      >
        <Text className="text-3xl text-white">+</Text>
      </Pressable>

      <ExpenseSheet
        visible={sheetOpen}
        categories={categories}
        expense={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          refresh();
        }}
      />
    </SafeAreaView>
  );
}
