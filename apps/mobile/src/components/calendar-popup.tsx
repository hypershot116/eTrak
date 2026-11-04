import { useEffect, useState } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { dayOffset, monthLabel, parseDateParts } from '@/lib/dates';

const WEEK_STARTS_ON = 0; // 0 = Sunday, 1 = Monday
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const cellStyle: ViewStyle = { width: '14.2857%', aspectRatio: 1 };
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
};

export function CalendarPopup({ visible, value, onSelect, onClose }: Props) {
  const [view, setView] = useState(() => {
    const p = parseDateParts(value);
    return { y: p.y, m: p.m };
  });

  // Each time the popup opens, show the month of the current value.
  useEffect(() => {
    if (!visible) return;
    const p = parseDateParts(value);
    setView({ y: p.y, m: p.m });
  }, [visible, value]);

  if (!visible) return null;

  const today = dayOffset(0);
  const first = new Date(view.y, view.m, 1).getDay();
  const lead = (first - WEEK_STARTS_ON + 7) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (deltaMonths: number) => {
    const d = new Date(view.y, view.m + deltaMonths, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const keyFor = (day: number) => `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
  const pick = (key: string) => {
    onSelect(key);
    onClose();
  };

  const navBtn = 'h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800';
  const navText = 'text-lg text-zinc-800 dark:text-zinc-200';

  return (
    <View className="absolute inset-0 z-20 items-center justify-center bg-black/50 px-4">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="w-full max-w-sm rounded-3xl bg-white p-4 dark:bg-zinc-900">
        <View className="flex-row items-center justify-between pb-3">
          <Pressable onPress={() => move(-12)} className={navBtn}>
            <Text className={navText}>«</Text>
          </Pressable>
          <Pressable onPress={() => move(-1)} className={navBtn}>
            <Text className={navText}>‹</Text>
          </Pressable>
          <Text className="flex-1 text-center text-base font-semibold text-zinc-900 dark:text-white">
            {monthLabel(view.y, view.m)}
          </Text>
          <Pressable onPress={() => move(1)} className={navBtn}>
            <Text className={navText}>›</Text>
          </Pressable>
          <Pressable onPress={() => move(12)} className={navBtn}>
            <Text className={navText}>»</Text>
          </Pressable>
        </View>

        <View className="flex-row">
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={{ width: '14.2857%' }} className="items-center pb-1">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                {WEEKDAYS[(i + WEEK_STARTS_ON) % 7]}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {cells.map((day, i) => {
            if (day === null) return <View key={`blank-${i}`} style={cellStyle} />;
            const key = keyFor(day);
            const selected = key === value;
            const isToday = key === today;
            return (
              <Pressable
                key={key}
                onPress={() => pick(key)}
                style={cellStyle}
                className="items-center justify-center p-0.5"
              >
                <View
                  className={`h-full w-full items-center justify-center rounded-full ${
                    selected ? 'bg-accent' : isToday ? 'border border-accent' : ''
                  }`}
                >
                  <Text
                    className={
                      selected ? 'font-bold text-white' : 'text-zinc-900 dark:text-zinc-100'
                    }
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row justify-between pt-3">
          <Pressable onPress={() => pick(today)} className="px-3 py-2">
            <Text className="font-semibold text-accent">Today</Text>
          </Pressable>
          <Pressable onPress={onClose} className="px-3 py-2">
            <Text className="text-zinc-500 dark:text-zinc-400">Close</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
