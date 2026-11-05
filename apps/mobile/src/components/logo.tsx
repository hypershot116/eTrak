import Svg, { Polygon, Text as SvgText } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string; // outline and letter color (the accent color)
};

// Outlined hexagon with an "e" inside. A faint wide stroke behind it gives a soft neon glow.
export function Logo({ size = 40, color = '#7242ee' }: Props) {
  const hex = '50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={hex} fill="none" stroke={color} strokeWidth={10} strokeOpacity={0.18} strokeLinejoin="round" />
      <Polygon points={hex} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" />
      <SvgText x="50" y="66" fontSize="46" fontWeight="bold" fill={color} textAnchor="middle">
        e
      </SvgText>
    </Svg>
  );
}
