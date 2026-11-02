import type { Category, Expense } from '@etrak/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart } from '@/components/bar-chart';
import { DbErrorBanner } from '@/components/db-error-banner';
import { DonutChart } from '@/components/donut-chart';
import { listCategories } from '@/db/categories-repo';
import { listExpensesInRange } from '@/db/expenses-repo';
import { monthLabel, monthRange } from '@/lib/dates';
import { formatMinor } from '@/lib/money';

const palette = [
  '#6366f1', '#10b981', '#f43f5e', '#f59e0b',
  '#0ea5e9', '#a855f7', '#14b8a6', '#ec4899',
];

export default function InsightsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const isCurrentMonth = month.y === now.getFullYear() && month.m === now.getMonth();

  const refresh = useCallback(async () => {
    try {
      setCategories(await listCategories(true));
      // 6 months ending at the selected month
      const start = new Date(month.y, month.m - 5, 1).getTime();
      const end = monthRange(month.y, month.m)[1];
      setExpenses(await listExpensesInRange(start, end));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const [mStart, mEnd] = monthRange(month.y, month.m);
  const inMonth = useMemo(
    () => expenses.filter((e) => e.spentAt >= mStart && e.spentAt < mEnd),
    [expenses, mStart, mEnd]
  );

  // Currencies used this month, biggest first
  const currencyTotals = useMemo(() => {
    const sums = new Map<string, number>();
    for (const e of inMonth) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
    return [...sums.entries()].sort((a, b) => b[1] - a[1]);
  }, [inMonth]);

  const currency =
    picked && currencyTotals.some(([c]) => c === picked) ? picked : (currencyTotals[0]?.[0] ?? null);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const slices = useMemo(() => {
    if (!currency) return [];
    const sums = new Map<string, number>();
    for (const e of inMonth)
      if (e.currency === currency) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amountMinor);
    return [...sums.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, value], i) => ({
        id,
        value,
        color: palette[i % palette.length],
        name: categoryById.get(id)?.name ?? 'Unknown',
        emoji: categoryById.get(id)?.emoji ?? '❓',
      }));
  }, [inMonth, currency, categoryById]);

  const monthTotal = slices.reduce((s, x) => s + x.value, 0);

  const bars = useMemo(() => {
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(month.y, month.m - i, 1);
      const [s, e] = monthRange(d.getFullYear(), d.getMonth());
      const value = currency
        ? expenses
            .filter((x) => x.currency === currency && x.spentAt >= s && x.spentAt < e)
            .reduce((sum, x) => sum + x.amountMinor, 0)
        : 0;
      out.push({
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        value,
        highlight: i === 0,
      });
    }
    return out;
  }, [expenses, month, currency]);

  const shiftMonth = (delta: number) =>
    setMonth((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="w-full max-w-2xl gap-6 self-center px-5">
          <Text className="pt-4 text-3xl font-bold text-zinc-900 dark:text-white">Insights</Text>

          <DbErrorBanner error={error} />

          <View className="flex-row items-center justify-between">
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

          {currencyTotals.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              {currencyTotals.map(([code]) => (
                <Pressable
                  key={code}
                  onPress={() => setPicked(code)}
                  className={`rounded-full px-3 py-1.5 ${
                    currency === code ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  <Text className={currency === code ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}>
                    {code}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {currency && slices.length > 0 ? (
            <>
              <View className="gap-4 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
                <Text className="font-semibold text-zinc-900 dark:text-white">By category</Text>
                <View className="items-center">
                  <DonutChart
                    slices={slices}
                    centerTop="Total"
                    centerBottom={formatMinor(monthTotal, currency)}
                  />
                </View>
                <View className="gap-2">
                  {slices.map((s) => (
                    <View key={s.id} className="flex-row items-center gap-3">
                      <View style={{ backgroundColor: s.color }} className="h-3 w-3 rounded-full" />
                      <Text className="flex-1 text-zinc-900 dark:text-zinc-100">
                        {s.emoji} {s.name}
                      </Text>
                      <Text className="text-zinc-500 dark:text-zinc-400">
                        {Math.round((s.value / monthTotal) * 100)}%
                      </Text>
                      <Text className="w-24 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatMinor(s.value, currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="gap-4 rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
                <Text className="font-semibold text-zinc-900 dark:text-white">
                  Last 6 months ({currency})
                </Text>
                <BarChart bars={bars} />
              </View>
            </>
          ) : (
            <Text className="pt-10 text-center text-zinc-500 dark:text-zinc-400">
              No expenses in this month yet. Add some and the charts will appear here.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
