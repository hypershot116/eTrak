import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hexToHsl, hslToHex, normalizeHex, type Hsl } from '@/lib/color';

const THUMB = 26;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// One horizontal gradient slider. value is 0-1.
function Slider({
  id,
  label,
  value,
  stops,
  thumbColor,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  stops: string[];
  thumbColor: string;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startX = useRef(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const pan = useMemo(() => {
    const apply = (x: number) => {
      const w = widthRef.current;
      if (w > 0) onChangeRef.current(clamp01(x / w));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        apply(startX.current);
      },
      onPanResponderMove: (_, g) => apply(startX.current + g.dx),
    });
  }, []);

  return (
    <View className="gap-1">
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
      <View
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        style={{ height: THUMB + 4, justifyContent: 'center' }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none">
          <Svg width="100%" height={14}>
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                {stops.map((c, i) => (
                  <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="14" rx="7" fill={`url(#${id})`} />
          </Svg>
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: Math.max(0, value * width - THUMB / 2),
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: thumbColor,
            borderWidth: 3,
            borderColor: '#ffffff',
          }}
        />
      </View>
    </View>
  );
}

// Free color picker: hue, saturation and lightness sliders, a hex field and quick swatches.
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(value));
  const [hexText, setHexText] = useState(() => normalizeHex(value) ?? value);

  // Follow changes that come from outside (for example loading the saved color).
  useEffect(() => {
    const outside = normalizeHex(value);
    if (outside && outside !== hslToHex(hsl)) {
      setHsl(hexToHsl(outside));
      setHexText(outside);
    }
  }, [value, hsl]);

  const hex = hslToHex(hsl);

  const update = (next: Partial<Hsl>) => {
    const n = { ...hsl, ...next };
    const nextHex = hslToHex(n);
    setHsl(n);
    setHexText(nextHex);
    onChange(nextHex);
  };

  const pickHex = (h: string) => {
    setHsl(hexToHsl(h));
    setHexText(h);
    onChange(h);
  };

  const onHexInput = (text: string) => {
    setHexText(text);
    const clean = text.trim().replace(/^#/, '');
    if (clean.length === 6) {
      const ok = normalizeHex(clean);
      if (ok) pickHex(ok);
    }
  };

  const onHexDone = () => {
    const ok = normalizeHex(hexText);
    if (ok) pickHex(ok);
    else setHexText(hex);
  };

  const hueStops = [0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex({ h, s: 1, l: 0.5 }));
  const satStops = [hslToHex({ h: hsl.h, s: 0, l: hsl.l }), hslToHex({ h: hsl.h, s: 1, l: hsl.l })];
  const lightStops = ['#000000', hslToHex({ h: hsl.h, s: hsl.s, l: 0.5 }), '#ffffff'];

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View
          style={{ backgroundColor: hex, width: 44, height: 44, borderRadius: 12 }}
          className="border border-zinc-300 dark:border-zinc-700"
        />
        <TextInput
          value={hexText}
          onChangeText={onHexInput}
          onBlur={onHexDone}
          onSubmitEditing={onHexDone}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          placeholder="#7242ee"
          placeholderTextColor="#a1a1aa"
          className="w-28 rounded-xl border border-zinc-300 px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:text-white"
        />
      </View>

      <Slider
        id="cp-hue"
        label="Color"
        value={hsl.h / 360}
        stops={hueStops}
        thumbColor={hslToHex({ h: hsl.h, s: 1, l: 0.5 })}
        onChange={(v) => update({ h: v * 360 })}
      />
      <Slider
        id="cp-sat"
        label="Intensity"
        value={hsl.s}
        stops={satStops}
        thumbColor={hex}
        onChange={(v) => update({ s: v })}
      />
      <Slider
        id="cp-light"
        label="Brightness"
        value={hsl.l}
        stops={lightStops}
        thumbColor={hex}
        onChange={(v) => update({ l: v })}
      />

    </View>
  );
}
