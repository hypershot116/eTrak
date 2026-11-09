import type { Category, Expense } from '@etrak/shared';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { useAccent } from '@/lib/use-accent';

type Props = {
  visible: boolean;
  categories: Category[];
  expense: Expense | null;
  initialDate?: string;
  onClose: () => void;
  onSaved: (savedDate: string | null) => void;
  onCategoriesChanged?: () => void;
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
  const accentObj = useAccent();
  const accentColor = accentObj.accent;
  const onAccentColor = accentObj.onAccent || '#ffffff';

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dateText, setDateText] = useState(dayOffset(0));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [extra, setExtra] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
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
  }, [visible, expense]);

  if (!visible) return null;

  const cur = getCurrency(currency);
  const yesterday = dayOffset(-1);
  const today = dayOffset(0);
  const tomorrow = dayOffset(1);
  const typedName = newName.trim();

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

  const renderChip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? accentColor : '#27272a',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: active ? accentColor : '#3f3f46',
      }}
    >
      <Text
        style={{
          color: active ? onAccentColor : '#e4e4e7',
          fontWeight: active ? '700' : '500',
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={
          Platform.OS === 'web'
            ? ({
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100dvh',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
              } as any)
            : { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.75)' }
        }
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            width: '100%',
            maxWidth: 540,
            maxHeight: Platform.OS === 'web' ? '88dvh' : '88%',
            zIndex: 100000,
          }}
        >
          <ScrollView
            style={{
              width: '100%',
              backgroundColor: '#18181b',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: '#3f3f46',
            }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 40,
              gap: 16,
            }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#27272a',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>
                {isEdit ? 'Edit expense' : 'New expense'}
              </Text>
              <Pressable
                hitSlop={14}
                onPress={onClose}
                style={{
                  height: 32,
                  width: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9999,
                  backgroundColor: '#27272a',
                }}
              >
                <Text style={{ fontSize: 16, color: '#d4d4d8', fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>

            {/* Date Picker Card */}
            <Pressable
              onPress={() => setCalendarOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#3f3f46',
                backgroundColor: '#202024',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <CalendarIcon size={24} color={accentColor} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: accentColor,
                    fontSize: 12,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                  }}
                >
                  {weekdayName(dateText)}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>
                  {shortDateLabel(dateText)}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#a1a1aa' }}>
                {relativeDayTag(dateText)}
              </Text>
            </Pressable>

            {/* Day Quick Select */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {renderChip('Yesterday', dateText === yesterday, () => setDateText(yesterday))}
              {renderChip('Today', dateText === today, () => setDateText(today))}
              {renderChip('Tomorrow', dateText === tomorrow, () => setDateText(tomorrow))}
            </View>

            {/* Amount Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#e4e4e7' }}>
                {cur.code}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder={cur.digits === 0 ? '0' : '0.00'}
                placeholderTextColor="#71717a"
                keyboardType="decimal-pad"
                autoFocus
                onSubmitEditing={save}
                style={{
                  flex: 1,
                  fontSize: 32,
                  fontWeight: '800',
                  color: '#ffffff',
                  ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
                } as any}
              />
            </View>

            {/* Currency List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {currencies.map((c) =>
                  renderChip(c.code, currency === c.code, () => setCurrency(c.code))
                )}
              </View>
            </ScrollView>

            {/* Category Chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allCats.map((c) =>
                renderChip(
                  categoryLabel(c),
                  categoryId === c.id && !(creating && typedName),
                  () => setCategoryId(c.id)
                )
              )}
              <Pressable
                onPress={() => {
                  setCreating((v) => !v);
                  setCatError(null);
                }}
                style={{
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: accentColor,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: accentColor, fontWeight: '600', fontSize: 14 }}>
                  {creating ? 'Cancel' : '+ New category'}
                </Text>
              </Pressable>
            </View>

            {/* Inline Add Category Form */}
            {creating ? (
              <View
                style={{
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#3f3f46',
                  backgroundColor: '#202024',
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 36, textAlign: 'center', fontSize: 26, color: '#a1a1aa' }}>
                    {newEmoji || '•'}
                  </Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="New category name"
                    placeholderTextColor="#71717a"
                    maxLength={20}
                    autoFocus
                    onSubmitEditing={createFromForm}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#3f3f46',
                      backgroundColor: '#18181b',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      color: '#ffffff',
                      ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
                    } as any}
                  />
                  <Pressable
                    onPress={createFromForm}
                    disabled={catBusy}
                    style={{
                      backgroundColor: accentColor,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: onAccentColor, fontWeight: '600' }}>
                      {catBusy ? '...' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
                {typedName ? (
                  <Text style={{ color: accentColor, fontSize: 12 }}>
                    Will save under “{newEmoji ? `${newEmoji} ` : ''}{typedName}”.
                  </Text>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {categoryEmojis.map((e) => (
                      <Pressable
                        key={e}
                        onPress={() => setNewEmoji(newEmoji === e ? '' : e)}
                        style={{
                          backgroundColor: newEmoji === e ? accentColor : '#27272a',
                          height: 40,
                          width: 40,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ fontSize: 20 }}>{e}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {catError ? (
                  <Text style={{ fontSize: 14, color: '#ef4444' }}>{catError}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Note Input */}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor="#71717a"
              maxLength={200}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#3f3f46',
                backgroundColor: '#202024',
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                color: '#ffffff',
                ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
              } as any}
            />

            {error ? <Text style={{ fontSize: 14, color: '#ef4444' }}>{error}</Text> : null}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              {isEdit ? (
                <Pressable
                  onPress={remove}
                  disabled={saving}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: confirmDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: confirmDelete ? '#ffffff' : '#f87171',
                    }}
                  >
                    {confirmDelete ? 'Confirm delete' : 'Delete'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={save}
                disabled={saving}
                style={{
                  backgroundColor: accentColor,
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ color: onAccentColor, fontSize: 16, fontWeight: '700' }}>
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
    </Modal>
  );
}
