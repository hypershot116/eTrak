import { create } from 'zustand';

import { getSetting, setSetting } from '@/db/settings-repo';
import { DEFAULT_ACCENT, normalizeHex, type SurfaceStyle } from '@/lib/color';
import { legacyAccents } from './palettes';

export type ThemeMode = 'light' | 'dark' | 'system';

const modes: ThemeMode[] = ['light', 'dark', 'system'];
const surfaces: SurfaceStyle[] = ['midnight', 'matched', 'pure'];

const LS_MODE = 'etrak_theme_mode';
const LS_ACCENT = 'etrak_theme_accent';
const LS_SURFACE = 'etrak_theme_surface';

function getInitialValue<T extends string>(key: string, fallback: T): T {
  if (typeof window !== 'undefined') {
    try {
      const v = localStorage.getItem(key);
      if (v) return v as T;
    } catch {}
  }
  return fallback;
}

type ThemeState = {
  mode: ThemeMode;
  accent: string;
  surface: SurfaceStyle;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setSurface: (surface: SurfaceStyle) => void;
  hydrate: () => Promise<void>;
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useThemeStore = create<ThemeState>((set) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === LS_MODE && e.newValue) {
        set({ mode: e.newValue as ThemeMode });
      } else if (e.key === LS_ACCENT && e.newValue) {
        set({ accent: e.newValue });
      } else if (e.key === LS_SURFACE && e.newValue) {
        set({ surface: e.newValue as SurfaceStyle });
      }
    });
  }

  return {
    mode: getInitialValue(LS_MODE, 'dark'),
    accent: getInitialValue(LS_ACCENT, '#f97316'),
    surface: getInitialValue(LS_SURFACE, 'midnight'),
    hydrated: false,
    setMode: (mode) => {
      set({ mode });
      try {
        localStorage.setItem(LS_MODE, mode);
      } catch {}
      setSetting('theme_mode', mode).catch(() => {});
    },
    setAccent: (value) => {
      const hex = normalizeHex(value) ?? DEFAULT_ACCENT;
      set({ accent: hex });
      try {
        localStorage.setItem(LS_ACCENT, hex);
      } catch {}
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        setSetting('theme_accent', hex).catch(() => {});
      }, 300);
    },
    setSurface: (surface) => {
      set({ surface });
      try {
        localStorage.setItem(LS_SURFACE, surface);
      } catch {}
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
          getInitialValue(LS_ACCENT, '#f97316');
        const mode = modes.includes(savedMode as ThemeMode)
          ? (savedMode as ThemeMode)
          : getInitialValue(LS_MODE, 'dark');
        const surface = surfaces.includes(savedSurface as SurfaceStyle)
          ? (savedSurface as SurfaceStyle)
          : getInitialValue(LS_SURFACE, 'midnight');

        set({ mode, accent, surface });
        try {
          localStorage.setItem(LS_MODE, mode);
          localStorage.setItem(LS_ACCENT, accent);
          localStorage.setItem(LS_SURFACE, surface);
        } catch {}
      } catch {
      } finally {
        set({ hydrated: true });
      }
    },
  };
});
