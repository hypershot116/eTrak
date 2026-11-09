import type { Category, Expense } from '@etrak/shared';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarPopup } from '@/components/calendar-popup';
import { DbErrorBanner } from '@/components/db-error-banner';
import { ExpenseSheet } from '@/components/expense-sheet';
import { CalendarIcon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { SyncBanner } from '@/components/sync-banner';
import { ensureDefaultCategories, listCategories } from '@/db/categories-repo';
import { listExpensesInRange } from '@/db/expenses-repo';
import { categoryEmoji } from '@/lib/category-display';
import {
  addDays,
  dayOffset,
  monthRange,
  parseDateParts,
  shortDateLabel,
  toDateInput,
  weekdayName,
} from '@/lib/dates';
import { formatMinor } from '@/lib/money';
import { readSession, useSyncState } from '@/lib/sync-engine';

function sumByCurrency(list: Expense[]): [string, number][] {
  const sums = new Map<string, number>();
  for (const e of list) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
  return [...sums.entries()].sort((a, b) => b[1] - a[1]);
}

function tick() {
  try {
    Haptics.selectionAsync();
  } catch {}
}

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [day, setDay] = useState(() => dayOffset(0));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSyncStatus, setShowSyncStatus] = useState(true);
  const sync = useSyncState();

  const today = dayOffset(0);
  const { y, m } = parseDateParts(day);

  useEffect(() => {
    readSession();
  }, []);

  useEffect(() => {
    if (sync.signedIn && !sync.syncing) {
      const t = setTimeout(() => {
        setShowSyncStatus(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [sync.signedIn, sync.syncing]);

  const refresh = useCallback(async () => {
    try {
      await ensureDefaultCategories();
      setCategories(await listCategories());
      setAllCategories(await listCategories(true));
      const [start, end] = monthRange(y, m);
      setMonthExpenses(await listExpensesInRange(start, end));
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Explicitly handle browser OPFS locking instead of failing silently
      if (msg.includes('Invalid VFS state') || msg.includes('locked') || msg.includes('busy')) {
        setError('App is active in another tab. Your browser limits database access to one tab at a time. Please close this tab and use the active one.');
      } else {
        setError(msg);
      }
    }
  }, [y, m]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (sync.dataVersion > 0) refresh();
  }, [sync.dataVersion, refresh]);

  const stepDay = useCallback((delta: number) => {
    setDay((prev) => addDays(prev, delta));
    tick();
  }, []);

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

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setSheetOpen(true);
  };

  const syncLabel = sync.syncing
    ? 'Syncing with Google Drive...'
    : sync.signedIn
    ? `Synced (${sync.email ?? 'Google account'})`
    : 'Local only (not signed in)';

  const greeting = sync.name
    ? `Hi, ${sync.givenName ?? sync.name.split(' ')[0]}`
    : null;

  const arrow = 'h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 active:opacity-60';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black items-center">
      <View
        {...(sheetOpen ? {} : pan.panHandlers)}
        className="flex-1 w-full px-5 pt-3"
        style={Platform.OS === 'web' ? { maxWidth: 640, width: '100%' } : { width: '100%' }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Logo />
            {greeting ? (
              <Text className="pt-0.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {greeting}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {day !== today ? (
              <Pressable
                onPress={() => setDay(today)}
                className="rounded-full bg-zinc-200 px-3 py-1.5 dark:bg-zinc-800 active:opacity-70"
              >
                <Text className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Today</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setCalendarOpen(true)} className={arrow}>
              <CalendarIcon />
            </Pressable>
          </View>
        </View>

        {showSyncStatus ? (
          <Text className="pb-3 text-xs text-zinc-500 dark:text-zinc-400">{syncLabel}</Text>
        ) : null}

        <DbErrorBanner error={error} />
        <SyncBanner />

        {sheetOpen ? (
          <ExpenseSheet
            visible={sheetOpen}
            categories={categories}
            expense={editing}
            initialDate={day}
            onClose={() => setSheetOpen(false)}
            onSaved={(d) => {
              setSheetOpen(false);
              if (d) setDay(d);
              refresh();
            }}
            onCategoriesChanged={refresh}
          />
        ) : (
          <>
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
              </Pressable>
              <Pressable onPress={() => stepDay(1)} className={arrow}>
                <Text className="text-xl text-zinc-800 dark:text-zinc-200">›</Text>
              </Pressable>
            </View>

            <View className="my-3 items-start">
              <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Total spent today
              </Text>
              {dayTotals.length === 0 ? (
                <Text className="text-2xl font-bold text-zinc-400 dark:text-zinc-600">
                  No spending
                </Text>
              ) : (
                <View className="gap-1">
                  {dayTotals.map(([cur, minor], idx) => {
                    const formatted = formatMinor(minor, cur);
                    const amountOnly = formatted.replace(/^[A-Z]+\s*/, '');
                    return idx === 0 ? (
                      <View key={cur} className="flex-row items-baseline gap-2">
                        <Text className="text-xl font-extrabold text-accent">{cur}</Text>
                        <Text className="text-4xl font-black text-zinc-900 dark:text-white">
                          {amountOnly}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        key={cur}
                        className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                      >
                        {formatted}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="mb-2 flex-row items-center justify-between pt-2">
              <Text className="text-sm font-bold uppercase tracking-wider text-zinc-500">Expenses</Text>
              <Pressable
                onPress={openNew}
                className="flex-row items-center gap-1.5 rounded-full bg-accent px-4 py-2 shadow-sm active:opacity-80"
              >
                <Text className="text-base font-bold text-white">+</Text>
                <Text className="text-sm font-bold text-white">Add</Text>
              </Pressable>
            </View>

            <FlatList
              data={dayExpenses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-zinc-400">No expenses recorded for this day</Text>
                  <Pressable onPress={openNew} className="mt-3">
                    <Text className="font-semibold text-accent">+ Add first expense</Text>
                  </Pressable>
                </View>
              }
              renderItem={({ item }) => {
                const cat = categoryById.get(item.categoryId);
                return (
                  <Pressable
                    onPress={() => openEdit(item)}
                    className="mb-2.5 flex-row items-center justify-between rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900 active:opacity-70"
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-2xl">{categoryEmoji(cat)}</Text>
                      <View>
                        <Text className="font-bold text-zinc-900 dark:text-white">
                          {cat?.name ?? 'General'}
                        </Text>
                        {item.note ? (
                          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{item.note}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text className="text-base font-bold text-zinc-900 dark:text-white">
                      {formatMinor(item.amountMinor, item.currency)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        )}
      </View>

      <CalendarPopup
        visible={calendarOpen}
        value={day}
        onSelect={(d) => setDay(d)}
        onClose={() => setCalendarOpen(false)}
      />

      <View
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Text className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          v2.0.5
        </Text>
      </View>
    </SafeAreaView>
  );
}
