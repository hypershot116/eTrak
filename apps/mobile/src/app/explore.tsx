import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemePanel } from '@/theme/theme-panel';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 px-6">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</Text>
      <ThemePanel />
    </SafeAreaView>
  );
}
