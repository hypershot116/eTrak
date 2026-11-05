import { useColorScheme } from 'nativewind';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

export function CalendarIcon({ size = 22, color }: IconProps) {
  const { colorScheme } = useColorScheme();
  const c = color ?? (colorScheme === 'dark' ? '#e4e4e7' : '#27272a');
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3} />
      <Path d="M3.5 10h17" />
      <Path d="M8 3v4M16 3v4" />
      <Circle cx={12} cy={15} r={1.2} fill={c} stroke="none" />
    </Svg>
  );
}
