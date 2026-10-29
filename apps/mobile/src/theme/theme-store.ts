import { create } from 'zustand';
import type { AccentKey } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  accent: AccentKey;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  accent: 'indigo',
  setMode: (mode) => set({ mode }),
  setAccent: (accent) => set({ accent }),
}));
