import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAccent } from '@/lib/use-accent';

export type Bar = { label: string; value: number; highlight?: boolean };

const GAP = 8;

export function BarChart({ bars, height = 140 }: { bars: Bar[]; height?: number }) {
  const a = useAccent();
  const [width, setWidth] = useState(0);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const n = bars.length;
  const slot = n > 0 && width > 0 ? (width - GAP * (n - 1)) / n : 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="bar-hi" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={a.gradient[1]} />
              <Stop offset="1" stopColor={a.accent} stopOpacity={0.55} />
            </LinearGradient>
          </Defs>
          {bars.map((b, i) => {
            const h = max > 0 ? Math.max((b.value / max) * (height - 6), b.value > 0 ? 4 : 0) : 0;
            if (h <= 0) return null;
            const x = i * (slot + GAP);
            const y = height - h;
            return (
              <G key={i}>
                {b.highlight ? (
                  <Rect
                    x={x - 3}
                    y={y - 3}
                    width={slot + 6}
                    height={h + 3}
                    rx={11}
                    fill={a.accent}
                    fillOpacity={0.2}
                  />
                ) : null}
                <Rect
                  x={x}
                  y={y}
                  width={slot}
                  height={h}
                  rx={8}
                  fill={b.highlight ? 'url(#bar-hi)' : a.tint(0.3)}
                />
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      <View className="flex-row pt-1.5" style={{ gap: GAP }}>
        {bars.map((b, i) => (
          <Text key={i} className="flex-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
