import { Text, View } from 'react-native';

export type Bar = { label: string; value: number; highlight?: boolean };

export function BarChart({ bars, height = 140 }: { bars: Bar[]; height?: number }) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  return (
    <View className="flex-row gap-2" style={{ height: height + 24 }}>
      {bars.map((b, i) => {
        const h = max > 0 ? Math.max((b.value / max) * height, b.value > 0 ? 4 : 0) : 0;
        return (
          <View key={i} className="flex-1 items-center justify-end">
            <View
              style={{ height: h }}
              className={`w-full rounded-t-lg ${
                b.highlight ? 'bg-accent' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            />
            <Text className="pt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
