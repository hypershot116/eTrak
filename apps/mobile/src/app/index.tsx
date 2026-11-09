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
import { getSetting } from '@/db/settings-repo';
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
import { useAccent } from '@/lib/use-accent';
import { readSession, useSyncState } from '@/lib/sync-engine';

// Calculates totals but forces the user's Main Currency to ALWAYS be index 0
function calculateTotals(list: Expense[], mainCur: string): [string, number][] {
  const sums = new Map<string, number>();
  sums.set(mainCur, 0); // Guarantee the main currency is always present
  
  for (const e of list) {
    sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
  }
  
  return [...sums.entries()].sort((a, b) => {
    if (a[0] === mainCur) return -1;
    if (b[0] === mainCur) return 1;
    return b[1] - a[1];
  });
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
  const [mainCurrency, setMainCurrency] = useState('USD');
  const [day, setDay] = useState(() => dayOffset(0));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sync = useSyncState();
  const a = useAccent();

  const today = dayOffset(0);
  const { y, m } = parseDateParts(day);

  useEffect(() => {
    readSession();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const mc = await getSetting('main_currency');
      if (mc) setMainCurrency(mc);

      await ensureDefaultCategories();
      setCategories(await listCategories());
      setAllCategories(await listCategories(true));
      const [start, end] = monthRange(y, m);
      setMonthExpenses(await listExpensesInRange(start, end));
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('Invalid VFS state') && !msg.includes('locked')) {
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
  
  const dayTotals = useMemo(
    () => calculateTotals(dayExpenses, mainCurrency), 
    [dayExpenses, mainCurrency]
  );

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

  const arrow = 'h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 active:opacity-60';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#09090b] items-center">
      <View
        {...pan.panHandlers}
        className="flex-1 w-full px-5 pt-3"
        style={Platform.OS === 'web' ? { maxWidth: 640, width: '100%' } : { width: '100%' }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Logo />
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

        <Text className="-mt-3 pb-3 text-xs text-zinc-500 dark:text-zinc-400">{syncLabel}</Text>

        <DbErrorBanner error={error} />
        <SyncBanner />

        <View className="mb-2 flex-row items-center justify-between">
          <Pressable onPress={() => stepDay(-1)} className={arrow}>
            <Text className="text-xl text-zinc-800 dark:text-zinc-200">‹</Text>
          </Pressable>
          <Pressable onPress={() => setCalendarOpen(true)} className="flex-1 items-center">
            <Text style={{ color: a.accent }} className="text-xs font-bold uppercase tracking-widest">
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

        {/* --- Minimal Hero Total (Left-Aligned, Horizontal) --- */}
        <View className="my-6 items-start w-full px-1">
          <Text className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
            Total Spent Today
          </Text>
          
          <View className="items-start w-full">
            {dayTotals.slice(0, 3).map(([cur, minor], idx) => {
              const str = formatMinor(minor, cur);
              const space = str.indexOf(' ');
              const code = str.slice(0, space);
              const val = str.slice(space + 1);

              // Primary (Main) Currency - ALWAYS index 0, even if amount is 0
              if (idx === 0) {
                return (
                  <View key={cur} className="flex-row items-baseline gap-2 w-full">
                    <Text style={{ color: a.accent }} className="text-lg font-black">
                      {code}
                    </Text>
                    <Text 
                      className="text-[44px] leading-tight font-black text-zinc-900 dark:text-white shrink"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {val}
                    </Text>
                  </View>
                );
              }

              // Secondary Currencies (Only show if > 0)
              if (minor === 0) return null;

              return (
                <View key={cur} className="flex-row items-baseline gap-2 mt-0.5 opacity-80 w-full">
                  <Text className="text-sm font-bold text-zinc-500">{code}</Text>
                  <Text 
                    className="text-xl font-bold text-zinc-800 dark:text-zinc-300 shrink"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {val}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mb-2 flex-row items-center justify-between pt-3">
          <Text className="text-sm font-bold uppercase tracking-wider text-zinc-500">Expenses</Text>
          <Pressable
            onPress={openNew}
            style={{ backgroundColor: a.accent }}
            className="flex-row items-center gap-1.5 rounded-full px-4 py-2 shadow-sm active:opacity-80"
          >
            <Text style={{ color: a.onAccent || '#fff' }} className="text-base font-bold">+</Text>
            <Text style={{ color: a.onAccent || '#fff' }} className="text-sm font-bold">Add</Text>
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
                <Text style={{ color: a.accent }} className="font-semibold">+ Add first expense</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const cat = categoryById.get(item.categoryId);
            return (
              <Pressable
                onPress={() => openEdit(item)}
                className="mb-2.5 flex-row items-center justify-between rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 active:opacity-70"
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
      </View>

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

      <CalendarPopup
        visible={calendarOpen}
        value={day}
        onSelect={(d) => setDay(d)}
        onClose={() => setCalendarOpen(false)}
      />
      <View style={{ position: "absolute", bottom: 8, left: 12, opacity: 0.4, pointerEvents: "none" }}><Text style={{ color: "#a1a1aa", fontSize: 11, fontWeight: "600" }}>v1.0.1</Text></View>
    </SafeAreaView>
  );
}
