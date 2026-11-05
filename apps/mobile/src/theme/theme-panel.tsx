import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ColorPicker } from '@/components/color-picker';
import type { SurfaceStyle } from '@/lib/color';
import { useThemeStore, type ThemeMode } from './theme-store';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

const PRESETS = [
  '#7242ee', // violet (default)
  '#22d3ee', // cyan
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#22c55e', // green
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
];

const surfaceOptions: { key: SurfaceStyle; label: string }[] = [
  { key: 'midnight', label: 'Midnight' },
  { key: 'matched', label: 'Matched' },
  { key: 'pure', label: 'Pure black' },
];

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'}`}
    >
      <Text className={active ? 'font-semibold text-on-accent' : 'text-zinc-800 dark:text-zinc-200'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ThemePanel() {
  const { mode, accent, surface, setMode, setAccent, setSurface } = useThemeStore();
  const isPreset = PRESETS.includes(accent);
  const [customOpen, setCustomOpen] = useState(() => !isPreset);

  return (
    <View className="w-full gap-4">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-white">Appearance</Text>

      <View className="flex-row flex-wrap gap-2">
        {modes.map((m) => (
          <Chip key={m} active={mode === m} label={m} onPress={() => setMode(m)} />
        ))}
      </View>

      <Text className="text-base text-zinc-600 dark:text-zinc-300">Accent color</Text>
      <View className="flex-row flex-wrap items-center gap-3">
        {PRESETS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setAccent(c)}
            style={{ backgroundColor: c }}
            className={`h-10 w-10 rounded-full ${
              accent === c ? 'border-4 border-zinc-900 dark:border-white' : ''
            }`}
          />
        ))}
        <Chip
          active={customOpen || !isPreset}
          label="Custom color"
          onPress={() => setCustomOpen((v) => !v)}
        />
      </View>
      {customOpen || !isPreset ? <ColorPicker value={accent} onChange={setAccent} /> : null}

      <Text className="text-base text-zinc-600 dark:text-zinc-300">Background</Text>
      <View className="flex-row flex-wrap gap-2">
        {surfaceOptions.map((o) => (
          <Chip key={o.key} active={surface === o.key} label={o.label} onPress={() => setSurface(o.key)} />
        ))}
      </View>
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
        Midnight is a deep navy. Matched tints the background with your accent color. Pure black is
        plain black and white.
      </Text>
    </View>
  );
}
