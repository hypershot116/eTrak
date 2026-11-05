import { Pressable, Text, View } from 'react-native';

import { dismissNotice, useSyncState } from '@/lib/sync-engine';

// Shows one-time sync messages, for example "Your data is restored".
export function SyncBanner() {
  const { notice } = useSyncState();
  if (!notice) return null;
  return (
    <View className="mb-3 gap-2 rounded-2xl border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <Text className="text-base font-semibold text-accent">{notice.title}</Text>
      <Text className="text-sm text-zinc-700 dark:text-zinc-300">{notice.body}</Text>
      <Pressable
        onPress={dismissNotice}
        className="self-start rounded-full bg-zinc-200 px-4 py-1.5 dark:bg-zinc-800"
      >
        <Text className="text-sm text-zinc-800 dark:text-zinc-200">Got it</Text>
      </Pressable>
    </View>
  );
}
