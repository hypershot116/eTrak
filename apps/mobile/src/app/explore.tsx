import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupPanel } from '@/components/backup-panel';
import { CategoryManager } from '@/components/category-manager';
import { MainCurrency } from '@/components/main-currency';
import { useSyncState } from '@/lib/sync-engine';
import { ThemePanel } from '@/theme/theme-panel';

export default function SettingsScreen() {
  const sync = useSyncState();

  return (
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="w-full max-w-xl gap-8 self-center px-5">
          <View className="pt-4">
            <Text className="text-3xl font-bold text-zinc-900 dark:text-white">Settings</Text>
            {sync.signedIn ? (
              <View className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <Text className="text-xs font-bold uppercase tracking-wider text-accent">
                  Google Account
                </Text>
                <Text className="mt-0.5 text-base font-bold text-zinc-900 dark:text-white">
                  {sync.name ?? 'Connected User'}
                </Text>
                {sync.email ? (
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">{sync.email}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <ThemePanel />
          <MainCurrency />
          <CategoryManager />
          <BackupPanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
