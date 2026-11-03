import type { Category, Expense } from '@etrak/shared';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DbErrorBanner } from '@/components/db-error-banner';
import { listCategories } from '@/db/categories-repo';
import { listExpensesInRange } from '@/db/expenses-repo';
import { monthLabel, monthRange } from '@/lib/dates';
import { buildReportHtml, reportStyles, type ReportStyle } from '@/lib/report-html';
import { accents } from '@/theme/palettes';
import { useThemeStore } from '@/theme/theme-store';

// Web: print the report from a hidden frame; the browser's print dialog offers "Save as PDF".
function printOnWeb(html: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  document.body.appendChild(frame);
}

export default function ReportsScreen() {
  const accent = useThemeStore((s) => s.accent);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [style, setStyle] = useState<ReportStyle>('summary');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const now = new Date();
  const isCurrentMonth = month.y === now.getFullYear() && month.m === now.getMonth();

  const refresh = useCallback(async () => {
    try {
      setCategories(await listCategories(true));
      const [start, end] = monthRange(month.y, month.m);
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

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const currencyCount = useMemo(() => new Set(expenses.map((e) => e.currency)).size, [expenses]);

  const shiftMonth = (delta: number) => {
    setNotice(null);
    setMonth((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const download = async () => {
    setNotice(null);
    setError(null);
    try {
      setBusy(true);
      const html = buildReportHtml({
        style,
        monthTitle: monthLabel(month.y, month.m),
        expenses,
        categories: categoryById,
        accent: `rgb(${accents[accent]})`,
      });
      if (Platform.OS === 'web') {
        printOnWeb(html);
        setNotice('In the print window, set Destination to "Save as PDF" and click Save.');
        return;
      }
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        setNotice('PDF created, but sharing is not available on this device.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View className="w-full max-w-2xl gap-6 self-center px-5">
          <Text className="pt-4 text-3xl font-bold text-zinc-900 dark:text-white">Reports</Text>

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

          <View className="gap-3">
            <Text className="font-semibold text-zinc-900 dark:text-white">Report style</Text>
            {reportStyles.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => setStyle(s.key)}
                className={`rounded-2xl border-2 p-4 active:opacity-70 ${
                  style === s.key
                    ? 'border-accent bg-accent/10'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <Text className="text-base font-semibold text-zinc-900 dark:text-white">
                  {s.label}
                </Text>
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">{s.hint}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            {expenses.length === 0
              ? 'No expenses in this month, so there is nothing to report.'
              : `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}${
                  currencyCount > 1 ? ` in ${currencyCount} currencies (one section each)` : ''
                }`}
          </Text>

          {notice ? <Text className="text-sm text-accent">{notice}</Text> : null}

          <Pressable
            onPress={download}
            disabled={busy || expenses.length === 0}
            className={`items-center rounded-2xl bg-accent py-3.5 ${
              busy || expenses.length === 0 ? 'opacity-40' : ''
            }`}
          >
            <Text className="text-base font-semibold text-white">
              {busy ? 'Preparing...' : 'Download PDF'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
