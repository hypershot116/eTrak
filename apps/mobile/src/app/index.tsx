import type { Category, Expense } from '@etrak/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseSheet } from '@/components/expense-sheet';
import { ensureDefaultCategories, listCategories } from '@/db/categories-repo';
import { listExpenses } from '@/db/expenses-repo';
import { formatMinor } from '@/lib/money';

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]); // active, for the sheet
  const [allCategories, setAllCategories] = useState<Category[]>([]); // incl. deleted, for names
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      setCategories(await listCategories());
      setAllCategories(await listCategories(true));
      setExpenses(await listExpenses(200));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  // Runs on first open and every time the user comes back to this tab.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const categoryById = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );

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

        {error ? <Text className="pb-2 text-sm text-red-500">Database error: {error}</Text> : null}

        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text className="pt-10 text-center text-zinc-500 dark:text-zinc-400">
              No expenses yet. Tap + to add your first one.
            </Text>
          }
          renderItem={({ item }) => {
            const cat = categoryById.get(item.categoryId);
            return (
              <Pressable
                onPress={() => openEdit(item)}
                className="flex-row items-center gap-3 border-b border-zinc-200 py-3 active:opacity-60 dark:border-zinc-800"
              >
                <Text className="text-2xl">{cat?.emoji ?? '❓'}</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {cat?.name ?? 'Unknown'}
                  </Text>
                  {item.note ? (
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">{item.note}</Text>
                  ) : null}
                </View>
                <View className="items-end">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMinor(item.amountMinor, item.currency)}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(item.spentAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
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
