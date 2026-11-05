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
import { createCategory } from '@/db/categories-repo';
import { createExpense, softDeleteExpense, updateExpense } from '@/db/expenses-repo';
import { getSetting, setSetting } from '@/db/settings-repo';
import { categoryLabel } from '@/lib/category-display';
import { currencies, getCurrency } from '@/lib/currencies';
import {
  dateInputToMs,
  dayOffset,
  relativeDayTag,
  shortDateLabel,
  toDateInput,
  weekdayName,
} from '@/lib/dates';
import { categoryEmojis } from '@/lib/emojis';
import { parseAmountToMinor } from '@/lib/money';

type Props = {
  visible: boolean;
  categories: Category[];
  expense: Expense | null; // null = new expense, otherwise edit this one
  initialDate?: string; // YYYY-MM-DD, used for new expenses (the day being viewed)
  onClose: () => void;
  onSaved: (savedDate: string | null) => void; // null when the expense was deleted
  onCategoriesChanged?: () => void; // called after a category is created from the sheet
};

export function ExpenseSheet({
  visible,
  categories,
  expense,
  initialDate,
  onClose,
  onSaved,
  onCategoriesChanged,
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

  // Categories created from inside this sheet (shown at once, before the parent reloads)
  const [extra, setExtra] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(''); // empty = no emoji (optional)
  const [catError, setCatError] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);

  const isEdit = expense !== null;
  const allCats = [...categories, ...extra.filter((x) => !categories.some((c) => c.id === x.id))];

  useEffect(() => {
    if (!visible) setExtra((prev) => (prev.length ? [] : prev));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setConfirmDelete(false);
    setCalendarOpen(false);
    setCreating(false);
    setNewName('');
    setNewEmoji('');
    setCatError(null);
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
  const typedName = newName.trim();

  // Creates the category typed in the inline form (or selects the existing one with that name).
  // Returns the category, or null if it could not be created.
  const createFromForm = async (): Promise<Category | null> => {
    if (!typedName) {
      setCatError('Enter a name');
      return null;
    }
    const existing = allCats.find((c) => c.name.toLowerCase() === typedName.toLowerCase());
    try {
      setCatBusy(true);
      const result = existing ?? (await createCategory(typedName, newEmoji));
      if (!existing) {
        setExtra((prev) => [...prev, result]);
        onCategoriesChanged?.();
      }
      setCategoryId(result.id);
      setCreating(false);
      setNewName('');
      setNewEmoji('');
      setCatError(null);
      setError(null);
      return result;
    } catch (e) {
      setCatError(String(e));
      return null;
    } finally {
      setCatBusy(false);
    }
  };

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

    // If a new category was typed but not added yet, create it now and use it.
    let chosenCategoryId = categoryId;
    if (creating && typedName) {
      const created = await createFromForm();
      if (!created) return;
      chosenCategoryId = created.id;
    }
    if (!chosenCategoryId) {
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
          categoryId: chosenCategoryId,
          note: note.trim(),
          spentAt,
        });
      } else {
        await createExpense({
          amountMinor: minor,
          currency,
          categoryId: chosenCategoryId,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ maxHeight: '92%' }}
      >
        <ScrollView
          className="w-full max-w-xl self-center rounded-t-3xl bg-white dark:bg-zinc-900"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ padding: 20, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
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
            {allCats.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={chip(categoryId === c.id && !(creating && typedName))}
              >
                <Text className={chipText(categoryId === c.id && !(creating && typedName))}>
                  {categoryLabel(c)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setCreating((v) => !v);
                setCatError(null);
              }}
              className="rounded-full border border-dashed border-zinc-400 px-3 py-1.5 dark:border-zinc-600"
            >
              <Text className="text-accent">{creating ? 'Cancel' : '+ New category'}</Text>
            </Pressable>
          </View>

          {creating ? (
            <View className="gap-3 rounded-2xl border border-zinc-300 p-3 dark:border-zinc-700">
              <View className="flex-row items-center gap-2">
                <Text className="w-9 text-center text-3xl text-zinc-400">{newEmoji || '•'}</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="New category name"
                  placeholderTextColor="#a1a1aa"
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={createFromForm}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:text-white"
                />
                <Pressable
                  onPress={createFromForm}
                  disabled={catBusy}
                  className="rounded-xl bg-accent px-4 py-2"
                >
                  <Text className="font-semibold text-white">{catBusy ? '...' : 'Add'}</Text>
                </Pressable>
              </View>
              {typedName ? (
                <Text className="text-sm text-accent">
                  This expense will be saved under “{newEmoji ? `${newEmoji} ` : ''}{typedName}”.
                  Press Add, or just press Save expense.
                </Text>
              ) : null}
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Emoji is optional. Tap one to choose it, tap it again to remove it.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-1.5">
                  {categoryEmojis.map((e) => (
                    <Pressable
                      key={e}
                      onPress={() => setNewEmoji(newEmoji === e ? '' : e)}
                      className={`h-10 w-10 items-center justify-center rounded-xl ${
                        newEmoji === e ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    >
                      <Text className="text-xl">{e}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {catError ? <Text className="text-sm text-red-500">{catError}</Text> : null}
            </View>
          ) : null}

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
        </ScrollView>
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
