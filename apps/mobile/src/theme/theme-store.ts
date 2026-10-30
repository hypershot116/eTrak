import { create } from 'zustand';

import { getSetting, setSetting } from '@/db/settings-repo';
import { accents, type AccentKey } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'system';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

type ThemeState = {
  mode: ThemeMode;
  accent: AccentKey;
  hydrated: boolean; // true once saved settings have been loaded
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  accent: 'indigo',
  hydrated: false,
  setMode: (mode) => {
    set({ mode });
    setSetting('theme_mode', mode).catch(() => {});
  },
  setAccent: (accent) => {
    set({ accent });
    setSetting('theme_accent', accent).catch(() => {});
  },
  hydrate: async () => {
    try {
      const savedMode = await getSetting('theme_mode');
      const savedAccent = await getSetting('theme_accent');
      set({
        mode: modes.includes(savedMode as ThemeMode) ? (savedMode as ThemeMode) : 'system',
        accent: savedAccent && savedAccent in accents ? (savedAccent as AccentKey) : 'indigo',
      });
    } catch {
      // If the database is unavailable, fall back to defaults.
    } finally {
      set({ hydrated: true });
    }
  },
}));
