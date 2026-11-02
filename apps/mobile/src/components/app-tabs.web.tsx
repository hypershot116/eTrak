import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Expenses</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      className={`rounded-full px-5 py-2 active:opacity-70 ${
        isFocused ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          isFocused ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
        }`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View className="w-full items-center px-4 pt-3">
      <View className="w-full max-w-2xl flex-row justify-center gap-2 rounded-full bg-zinc-100 p-1.5 dark:bg-zinc-900">
        {props.children}
      </View>
    </View>
  );
}
