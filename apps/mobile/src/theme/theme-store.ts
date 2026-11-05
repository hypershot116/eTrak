import { create } from 'zustand';

import { getSetting, setSetting } from '@/db/settings-repo';
import { DEFAULT_ACCENT, normalizeHex, type SurfaceStyle } from '@/lib/color';
import { legacyAccents } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'system';

const modes: ThemeMode[] = ['light', 'dark', 'system'];
const surfaces: SurfaceStyle[] = ['midnight', 'matched', 'pure'];

type ThemeState = {
  mode: ThemeMode;
  accent: string; // the user's chosen color as hex, e.g. "#7242ee"
  surface: SurfaceStyle; // background style
  hydrated: boolean; // true once saved settings have been loaded
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setSurface: (surface: SurfaceStyle) => void;
  hydrate: () => Promise<void>;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  accent: DEFAULT_ACCENT,
  surface: 'midnight',
  hydrated: false,
  setMode: (mode) => {
    set({ mode });
    setSetting('theme_mode', mode).catch(() => {});
  },
  setAccent: (value) => {
    const hex = normalizeHex(value) ?? DEFAULT_ACCENT;
    set({ accent: hex });
    // Dragging a slider fires many changes; save once it settles.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      setSetting('theme_accent', hex).catch(() => {});
    }, 300);
  },
  setSurface: (surface) => {
    set({ surface });
    setSetting('theme_surface', surface).catch(() => {});
  },
  hydrate: async () => {
    try {
      const savedMode = await getSetting('theme_mode');
      const savedAccent = await getSetting('theme_accent');
      const savedSurface = await getSetting('theme_surface');
      const accent =
        (savedAccent && normalizeHex(savedAccent)) ||
        (savedAccent && legacyAccents[savedAccent]) ||
        DEFAULT_ACCENT;
      set({
        mode: modes.includes(savedMode as ThemeMode) ? (savedMode as ThemeMode) : 'system',
        accent,
        surface: surfaces.includes(savedSurface as SurfaceStyle)
          ? (savedSurface as SurfaceStyle)
          : 'midnight',
      });
    } catch {
      // If the database is unavailable, fall back to defaults.
    } finally {
      set({ hydrated: true });
    }
  },
}));
