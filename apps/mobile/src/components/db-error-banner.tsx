import { Platform, Pressable, Text, View } from 'react-native';

export function DbErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;

  const locked = /access ?handle|createSyncAccessHandle/i.test(error);

  if (locked) {
    return (
      <View className="mb-3 gap-2 rounded-2xl bg-amber-500/15 p-4">
        <Text className="font-semibold text-amber-600 dark:text-amber-400">
          eTrak is already open in another tab
        </Text>
        <Text className="text-sm text-zinc-700 dark:text-zinc-300">
          Close the other eTrak tab or window, then reload this one.
        </Text>
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={() => window.location.reload()}
            className="self-start rounded-full bg-accent px-4 py-1.5"
          >
            <Text className="font-semibold text-white">Reload</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return <Text className="pb-2 text-sm text-red-500">Database error: {error}</Text>;
}
