import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DbSmokeTest } from '@/db/smoke-test';
import { accents, type AccentKey } from '@/theme/palettes';
import { useThemeStore, type ThemeMode } from '@/theme/theme-store';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

export default function HomeScreen() {
  const { mode, accent, setMode, setAccent } = useThemeStore();

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="text-4xl font-bold text-accent">eTrak</Text>
      <Text className="text-base text-zinc-600 dark:text-zinc-300">
        Theme preview
      </Text>

      <View className="flex-row gap-2">
        {modes.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`rounded-full px-4 py-2 transition-colors duration-300 ${
              mode === m ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
          >
            <Text
              className={mode === m ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}
            >
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row gap-3">
        {(Object.keys(accents) as AccentKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setAccent(key)}
            style={{ backgroundColor: `rgb(${accents[key]})` }}
            className={`h-10 w-10 rounded-full ${
              accent === key ? 'border-4 border-zinc-900 dark:border-white' : ''
            }`}
          />
        ))}
      </View>

      <DbSmokeTest />
    </SafeAreaView>
  );
}
