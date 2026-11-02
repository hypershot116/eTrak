import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export type Slice = { value: number; color: string };

export function DonutChart({
  slices,
  size = 180,
  stroke = 26,
  centerTop,
  centerBottom,
}: {
  slices: Slice[];
  size?: number;
  stroke?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#a1a1aa33"
            strokeWidth={stroke}
            fill="none"
          />
          {total > 0
            ? slices.map((s, i) => {
                const len = (s.value / total) * c;
                const el = (
                  <Circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={s.color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${len} ${c - len}`}
                    strokeDashoffset={-acc}
                  />
                );
                acc += len;
                return el;
              })
            : null}
        </G>
      </Svg>
      <View className="absolute items-center">
        {centerTop ? (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{centerTop}</Text>
        ) : null}
        {centerBottom ? (
          <Text className="text-lg font-bold text-zinc-900 dark:text-white">{centerBottom}</Text>
        ) : null}
      </View>
    </View>
  );
}
