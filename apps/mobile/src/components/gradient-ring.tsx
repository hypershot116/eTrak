import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Stop } from 'react-native-svg';

import { useAccent } from '@/lib/use-accent';

const TICKS = 40;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function GradientRing({
  progress,
  size = 150,
  stroke = 10,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const a = useAccent();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, animValue]);

  const c = size / 2;
  const r = c - stroke / 2 - 12;
  const len = 2 * Math.PI * r;
  const tickInner = c - 6;
  const tickOuter = c - 2;

  // Map the 0-1 animated value to actual dash array lengths
  const animatedStrokeDasharray = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [`0 ${len}`, `${len} 0`],
  });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a.gradient[0]} />
            <Stop offset="0.55" stopColor={a.gradient[1]} />
            <Stop offset="1" stopColor={a.gradient[2]} />
          </LinearGradient>
        </Defs>

        {Array.from({ length: TICKS }, (_, i) => {
          const ang = (i / TICKS) * 2 * Math.PI;
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);
          return (
            <Line
              key={i}
              x1={c + tickInner * cos}
              y1={c + tickInner * sin}
              x2={c + tickOuter * cos}
              y2={c + tickOuter * sin}
              stroke={a.accent}
              strokeOpacity={0.25}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        <Circle cx={c} cy={c} r={r} stroke={a.tint(0.12)} strokeWidth={stroke} fill="none" />

        <G transform={`rotate(-90 ${c} ${c})`}>
          <AnimatedCircle
            cx={c}
            cy={c}
            r={r}
            stroke={a.accent}
            strokeOpacity={0.2}
            strokeWidth={stroke + 8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={animatedStrokeDasharray}
          />
          <AnimatedCircle
            cx={c}
            cy={c}
            r={r}
            stroke="url(#ring-grad)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={animatedStrokeDasharray}
          />
        </G>
      </Svg>
      
      {/* Content wrapper scaled to fit completely within the inner circle radius */}
      <View 
        style={{ 
          position: 'absolute', 
          width: r * 2 - 10,
          height: r * 2 - 10,
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {children}
      </View>
    </View>
  );
}
