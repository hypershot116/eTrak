import { Text, View } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';

import { useAccent } from '@/lib/use-accent';

type Props = {
  size?: number;
  showText?: boolean;
};

export function Logo({ size = 36, showText = true }: Props) {
  const accent = useAccent();
  const hex = '50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28';

  return (
    <View className="flex-row items-center gap-2">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points={hex}
          fill="none"
          stroke={accent.accentRgb ? `rgb(${accent.accentRgb})` : '#f97316'}
          strokeWidth={10}
          strokeOpacity={0.2}
          strokeLinejoin="round"
        />
        <Polygon
          points={hex}
          fill="none"
          stroke={accent.accentRgb ? `rgb(${accent.accentRgb})` : '#f97316'}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <SvgText
          x="50"
          y="66"
          fontSize="48"
          fontWeight="bold"
          fill={accent.accentRgb ? `rgb(${accent.accentRgb})` : '#f97316'}
          textAnchor="middle"
        >
          e
        </SvgText>
      </Svg>

      {showText ? (
        <View className="flex-row items-baseline">
          <Text className="text-2xl font-black text-accent tracking-tight">e</Text>
          <Text className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Trak
          </Text>
        </View>
      ) : null}
    </View>
  );
}
