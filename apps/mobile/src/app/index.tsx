import type { Category, Expense } from '@etrak/shared';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, PanResponder, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarPopup } from '@/components/calendar-popup';
import { DbErrorBanner } from '@/components/db-error-banner';
import { ExpenseSheet } from '@/components/expense-sheet';
import { CalendarIcon } from '@/components/icons';
import { ensureDefaultCategories, listCategories } from '@/db/categories-repo';
import { listExpensesInRange } from '@/db/expenses-repo';
import {
  addDays,
  dayOffset,
  monthLabel,
  monthRange,
  parseDateParts,
  relativeDayTag,
  shortDateLabel,
  toDateInput,
  weekdayName,
} from '@/lib/dates';
import { formatMinor } from '@/lib/money';

// Totals per currency (no conversion until exchange rates are added).
function sumByCurrency(list: Expense[]): [string, number][] {
  const sums = new Map<string, number>();
  for (const e of list) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
  return [...sums.entries()].sort((a, b) => b[1] - a[1]);
}

function tick() {
  try {
    Promise.resolve(Haptics.selectionAsync()).catch(() => {});
  } catch {}
}

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]); // active, for the sheet
  const [allCategories, setAllCategories] = useState<Category[]>([]); // incl. deleted, for names
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [day, setDay] = useState(() => dayOffset(0)); // YYYY-MM-DD being viewed
  const [sheetOpen, setSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = dayOffset(0);
  const { y, m } = parseDateParts(day);

  const refresh = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      setCategories(await listCategories());
      setAllCategories(await listCategories(true));
      const [start, end] = monthRange(y, m);
      setMonthExpenses(await listExpensesInRange(start, end));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [y, m]);

  // Runs on first open, when the viewed month changes, and when the user returns to this tab.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const stepDay = useCallback((delta: number) => {
    setDay((prev) => addDays(prev, delta));
    tick();
  }, []);

  // Swipe left = previous day, swipe right = next day.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx <= -60) stepDay(-1);
          else if (g.dx >= 60) stepDay(1);
        },
      }),
    [stepDay]
  );

  const categoryById = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );

  const dayExpenses = useMemo(
    () => monthExpenses.filter((e) => toDateInput(e.spentAt) === day),
    [monthExpenses, day]
  );
  const dayTotals = useMemo(() => sumByCurrency(dayExpenses), [dayExpenses]);
  const monthTotals = useMemo(() => sumByCurrency(monthExpenses), [monthExpenses]);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setSheetOpen(true);
  };

  const arrow =
    'h-10 w-10 items-center justify-center rounded-full bg-zinc-200 active:opacity-60 dark:bg-zinc-800';

  return (
    <SafeAreaView className="flex-1">
      <View className="w-full max-w-2xl flex-1 self-center px-5" {...pan.panHandlers}>
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-3xl font-bold text-accent">eTrak</Text>
          <View className="flex-row items-center gap-2">
            {day !== today ? (
              <Pressable
                onPress={() => setDay(today)}
                className="rounded-full bg-zinc-200 px-3 py-2 active:opacity-60 dark:bg-zinc-800"
              >
                <Text className="text-sm text-zinc-800 dark:text-zinc-200">Today</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setCalendarOpen(true)} className={arrow}>
              <CalendarIcon />
            </Pressable>
          </View>
        </View>

        <DbErrorBanner error={error} />

        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={() => stepDay(-1)} className={arrow}>
            <Text className="text-xl text-zinc-800 dark:text-zinc-200">‹</Text>
          </Pressable>
          <Pressable onPress={() => setCalendarOpen(true)} className="flex-1 items-center">
            <Text className="text-xs font-semibold uppercase tracking-widest text-accent">
              {weekdayName(day)}
            </Text>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
              {shortDateLabel(day)}
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{relativeDayTag(day)}</Text>
          </Pressable>
          <Pressable onPress={() => stepDay(1)} className={arrow}>
            <Text className="text-xl text-zinc-800 dark:text-zinc-200">›</Text>
          </Pressable>
        </View>

        {dayTotals.length > 0 ? (
          <View className="mb-2 gap-1 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
            <Text className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              {day > today ? 'Planned' : 'Spent'} on this day · {dayExpenses.length}{' '}
              {dayExpenses.length === 1 ? 'expense' : 'expenses'}
            </Text>
            {dayTotals.map(([code, minor]) => (
              <Text key={code} className="text-2xl font-bold text-zinc-900 dark:text-white">
                {formatMinor(minor, code)}
              </Text>
            ))}
          </View>
        ) : null}

        <Text className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          {monthLabel(y, m)}:{' '}
          {monthTotals.length
            ? monthTotals.map(([c, n]) => formatMinor(n, c)).join(' · ')
            : 'no expenses'}
        </Text>

        <FlatList
          data={dayExpenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text className="pt-10 text-center text-zinc-500 dark:text-zinc-400">
              {day > today
                ? 'Nothing planned for this day. Tap + to add a future expense.'
                : 'No expenses on this day. Tap + to add one.'}
            </Text>
          }
          renderItem={({ item: e }) => {
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
        initialDate={day}
        onClose={() => setSheetOpen(false)}
        onSaved={(savedDate) => {
          setSheetOpen(false);
          if (savedDate) setDay(savedDate);
          refresh();
        }}
      />

      <CalendarPopup
        visible={calendarOpen}
        value={day}
        onSelect={(d) => setDay(d)}
        onClose={() => setCalendarOpen(false)}
      />
    </SafeAreaView>
  );
}
