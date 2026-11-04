import type { Category, Expense } from '@etrak/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CalendarPopup } from '@/components/calendar-popup';
import { CalendarIcon } from '@/components/icons';
import { createExpense, softDeleteExpense, updateExpense } from '@/db/expenses-repo';
import { getSetting, setSetting } from '@/db/settings-repo';
import { currencies, getCurrency } from '@/lib/currencies';
import {
  dateInputToMs,
  dayOffset,
  relativeDayTag,
  shortDateLabel,
  toDateInput,
  weekdayName,
} from '@/lib/dates';
import { parseAmountToMinor } from '@/lib/money';

type Props = {
  visible: boolean;
  categories: Category[];
  expense: Expense | null; // null = new expense, otherwise edit this one
  initialDate?: string; // YYYY-MM-DD, used for new expenses (the day being viewed)
  onClose: () => void;
  onSaved: (savedDate: string | null) => void; // null when the expense was deleted
};

export function ExpenseSheet({
  visible,
  categories,
  expense,
  initialDate,
  onClose,
  onSaved,
}: Props) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(dayOffset(0));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = expense !== null;

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setConfirmDelete(false);
    setCalendarOpen(false);
    if (expense) {
      const digits = getCurrency(expense.currency).digits;
      setAmount((expense.amountMinor / 10 ** digits).toFixed(digits));
      setCurrency(expense.currency);
      setCategoryId(expense.categoryId);
      setNote(expense.note);
      setDateText(toDateInput(expense.spentAt));
      return;
    }
    setAmount('');
    setNote('');
    setDateText(initialDate ?? dayOffset(0));
    setCategoryId((prev) => prev ?? categories[0]?.id ?? null);
    getSetting('last_currency').then(async (c) => {
      const preferred = c ?? (await getSetting('main_currency'));
      if (preferred) setCurrency(preferred);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expense]);

  if (!visible) return null;

  const cur = getCurrency(currency);
  const yesterday = dayOffset(-1);
  const today = dayOffset(0);
  const tomorrow = dayOffset(1);

  const save = async () => {
    const minor = parseAmountToMinor(amount, cur.digits);
    if (minor === null) {
      setError(
        cur.digits === 0
          ? 'Enter a whole amount, for example 500'
          : `Enter a valid amount, up to ${cur.digits} decimals`
      );
      return;
    }
    if (!categoryId) {
      setError('Choose a category');
      return;
    }

    // Date: keep the original timestamp if the date wasn't changed. Any date is allowed, including the future.
    let spentAt: number;
    if (expense && dateText === toDateInput(expense.spentAt)) {
      spentAt = expense.spentAt;
    } else {
      const ms = dateInputToMs(dateText, expense ? expense.spentAt : Date.now());
      if (ms === null) {
        setError('Choose a valid date');
        return;
      }
      spentAt = ms;
    }

    try {
      setSaving(true);
      if (expense) {
        await updateExpense(expense.id, {
          amountMinor: minor,
          currency,
          categoryId,
          note: note.trim(),
          spentAt,
        });
      } else {
        await createExpense({
          amountMinor: minor,
          currency,
          categoryId,
          note: note.trim(),
          spentAt,
        });
      }
      await setSetting('last_currency', currency);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onSaved(toDateInput(spentAt));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!expense) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setSaving(true);
      await softDeleteExpense(expense.id);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      onSaved(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 ${active ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'}`;
  const chipText = (active: boolean) =>
    active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200';

  return (
    <View className="absolute inset-0 z-10 justify-end bg-black/40">
      <Pressable className="flex-1" onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="w-full max-w-xl gap-4 self-center rounded-t-3xl bg-white p-5 dark:bg-zinc-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
              {isEdit ? 'Edit expense' : 'New expense'}
            </Text>
            <Pressable onPress={onClose}>
              <Text className="text-xl text-zinc-500">✕</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setCalendarOpen(true)}
            className="flex-row items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3 active:opacity-70 dark:border-zinc-700"
          >
            <CalendarIcon size={26} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-accent">
                {weekdayName(dateText)}
              </Text>
              <Text className="text-xl font-bold text-zinc-900 dark:text-white">
                {shortDateLabel(dateText)}
              </Text>
            </View>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {relativeDayTag(dateText)}
            </Text>
          </Pressable>

          <View className="flex-row gap-2">
            <Pressable onPress={() => setDateText(yesterday)} className={chip(dateText === yesterday)}>
              <Text className={chipText(dateText === yesterday)}>Yesterday</Text>
            </Pressable>
            <Pressable onPress={() => setDateText(today)} className={chip(dateText === today)}>
              <Text className={chipText(dateText === today)}>Today</Text>
            </Pressable>
            <Pressable onPress={() => setDateText(tomorrow)} className={chip(dateText === tomorrow)}>
              <Text className={chipText(dateText === tomorrow)}>Tomorrow</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-semibold text-zinc-500">{cur.code}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={cur.digits === 0 ? '0' : '0.00'}
              placeholderTextColor="#a1a1aa"
              keyboardType="decimal-pad"
              autoFocus
              onSubmitEditing={save}
              className="flex-1 text-4xl font-bold text-zinc-900 dark:text-white"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {currencies.map((c) => (
                <Pressable
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  className={chip(currency === c.code)}
                >
                  <Text className={chipText(currency === c.code)}>{c.code}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={chip(categoryId === c.id)}
              >
                <Text className={chipText(categoryId === c.id)}>
                  {c.emoji} {c.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor="#a1a1aa"
            maxLength={200}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:text-white"
          />

          {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

          <View className="flex-row gap-3">
            {isEdit ? (
              <Pressable
                onPress={remove}
                disabled={saving}
                className={`items-center justify-center rounded-2xl px-5 py-3 ${
                  confirmDelete ? 'bg-red-500' : 'bg-red-500/15'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    confirmDelete ? 'text-white' : 'text-red-500'
                  }`}
                >
                  {confirmDelete ? 'Tap again to delete' : 'Delete'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-1 items-center rounded-2xl bg-accent py-3"
            >
              <Text className="text-base font-semibold text-white">
                {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Save expense'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CalendarPopup
        visible={calendarOpen}
        value={dateText}
        onSelect={(d) => setDateText(d)}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
}
