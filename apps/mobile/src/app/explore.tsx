import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryManager } from '@/components/category-manager';
import { MainCurrency } from '@/components/main-currency';
import { ThemePanel } from '@/theme/theme-panel';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="w-full max-w-xl gap-8 self-center px-5">
          <Text className="pt-4 text-3xl font-bold text-zinc-900 dark:text-white">Settings</Text>
          <ThemePanel />
          <MainCurrency />
          <CategoryManager />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
