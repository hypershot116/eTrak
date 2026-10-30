import type { Category } from '@etrak/shared';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  createCategory,
  listCategories,
  softDeleteCategory,
  updateCategory,
} from '@/db/categories-repo';
import { categoryEmojis } from '@/lib/emojis';

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(categoryEmojis[0]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await listCategories());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (target: Category | 'new') => {
    setEditing(target);
    setName(target === 'new' ? '' : target.name);
    setEmoji(target === 'new' ? categoryEmojis[0] : target.emoji);
    setError(null);
    setConfirmDelete(false);
  };

  const close = () => {
    setEditing(null);
    setError(null);
    setConfirmDelete(false);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    const editingId = editing && editing !== 'new' ? editing.id : null;
    const duplicate = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError('You already have a category with that name');
      return;
    }
    try {
      setBusy(true);
      if (editingId) await updateCategory(editingId, { name: trimmed, emoji });
      else await createCategory(trimmed, emoji);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await load();
      close();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    if (categories.length <= 1) {
      setError('Keep at least one category');
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      setBusy(true);
      await softDeleteCategory(editing.id);
      await load();
      close();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="w-full gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-zinc-900 dark:text-white">Categories</Text>
        {editing === null ? (
          <Pressable onPress={() => open('new')} className="rounded-full bg-accent px-4 py-1.5">
            <Text className="font-semibold text-white">+ Add</Text>
          </Pressable>
        ) : null}
      </View>

      {editing === null ? (
        <View className="flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => open(c)}
              className="rounded-full bg-zinc-200 px-3 py-1.5 active:opacity-60 dark:bg-zinc-800"
            >
              <Text className="text-zinc-800 dark:text-zinc-200">
                {c.emoji} {c.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="gap-4 rounded-2xl border border-zinc-300 p-4 dark:border-zinc-700">
          <Text className="font-semibold text-zinc-900 dark:text-white">
            {editing === 'new' ? 'New category' : 'Edit category'}
          </Text>

          <View className="flex-row items-center gap-3">
            <Text className="text-4xl">{emoji}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor="#a1a1aa"
              maxLength={20}
              autoFocus
              onSubmitEditing={save}
              className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:text-white"
            />
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {categoryEmojis.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                className={`h-11 w-11 items-center justify-center rounded-xl ${
                  emoji === e ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
                }`}
              >
                <Text className="text-2xl">{e}</Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text className="text-sm text-red-500">{error}</Text> : null}

          <View className="flex-row gap-3">
            {editing !== 'new' ? (
              <Pressable
                onPress={remove}
                disabled={busy}
                className={`items-center justify-center rounded-2xl px-4 py-3 ${
                  confirmDelete ? 'bg-red-500' : 'bg-red-500/15'
                }`}
              >
                <Text
                  className={`font-semibold ${confirmDelete ? 'text-white' : 'text-red-500'}`}
                >
                  {confirmDelete ? 'Tap again to delete' : 'Delete'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={close}
              disabled={busy}
              className="items-center justify-center rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800"
            >
              <Text className="font-semibold text-zinc-800 dark:text-zinc-200">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={busy}
              className="flex-1 items-center rounded-2xl bg-accent py-3"
            >
              <Text className="font-semibold text-white">{busy ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>

          {editing !== 'new' ? (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Deleting a category keeps your past expenses. They still show its name.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
