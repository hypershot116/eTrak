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

import { createExpense, softDeleteExpense, updateExpense } from '@/db/expenses-repo';
import { getSetting, setSetting } from '@/db/settings-repo';
import { currencies, getCurrency } from '@/lib/currencies';
import { parseAmountToMinor } from '@/lib/money';

type Props = {
  visible: boolean;
  categories: Category[];
  expense: Expense | null; // null = new expense, otherwise edit this one
  onClose: () => void;
  onSaved: () => void;
};

export function ExpenseSheet({ visible, categories, expense, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = expense !== null;

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setConfirmDelete(false);
    if (expense) {
      const digits = getCurrency(expense.currency).digits;
      setAmount((expense.amountMinor / 10 ** digits).toFixed(digits));
      setCurrency(expense.currency);
      setCategoryId(expense.categoryId);
      setNote(expense.note);
      return;
    }
    setAmount('');
    setNote('');
    setCategoryId((prev) => prev ?? categories[0]?.id ?? null);
    getSetting('last_currency').then(async (c) => {
      const preferred = c ?? (await getSetting('main_currency'));
      if (preferred) setCurrency(preferred);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expense]);

  if (!visible) return null;

  const cur = getCurrency(currency);

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
    try {
      setSaving(true);
      if (expense) {
        await updateExpense(expense.id, {
          amountMinor: minor,
          currency,
          categoryId,
          note: note.trim(),
        });
      } else {
        await createExpense({ amountMinor: minor, currency, categoryId, note: note.trim() });
      }
      await setSetting('last_currency', currency);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onSaved();
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
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

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
                  className={`rounded-full px-3 py-1.5 ${
                    currency === c.code ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  <Text
                    className={
                      currency === c.code ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'
                    }
                  >
                    {c.code}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full px-3 py-1.5 ${
                  categoryId === c.id ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
                }`}
              >
                <Text
                  className={
                    categoryId === c.id ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'
                  }
                >
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
    </View>
  );
}
