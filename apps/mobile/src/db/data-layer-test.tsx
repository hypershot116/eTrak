import type { Category, Expense } from '@etrak/shared';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ensureDefaultCategories, listCategories } from './categories-repo';
import { createExpense, listExpenses, softDeleteExpense } from './expenses-repo';

export function DataLayerTest() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      setCategories(await listCategories());
      setExpenses(await listExpenses(5));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTest = async () => {
    try {
      const first = categories[0];
      if (!first) return;
      await createExpense({
        amountMinor: 1250,
        currency: 'USD',
        categoryId: first.id,
        note: 'Test expense',
      });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id: string) => {
    try {
      await softDeleteExpense(id);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) {
    return <Text className="text-sm text-red-500">Database error: {error}</Text>;
  }

  return (
    <View className="items-center gap-3">
      <Text className="text-sm text-zinc-500 dark:text-zinc-400">
        {categories.length} categories: {categories.map((c) => c.emoji).join(' ')}
      </Text>
      <Pressable onPress={addTest} className="rounded-full bg-accent px-4 py-2">
        <Text className="text-white">Add test expense (12.50 USD)</Text>
      </Pressable>
      {expenses.map((e) => (
        <View key={e.id} className="flex-row items-center gap-3">
          <Text className="text-sm text-zinc-700 dark:text-zinc-200">
            {(e.amountMinor / 100).toFixed(2)} {e.currency} · {e.note}
          </Text>
          <Pressable onPress={() => remove(e.id)}>
            <Text className="text-sm text-red-500">delete</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
