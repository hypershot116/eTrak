// Color helpers for the accent system. Pure functions, no React.
export type Mode = 'light' | 'dark';
export type Rgb = { r: number; g: number; b: number }; // 0-255
export type Hsl = { h: number; s: number; l: number }; // h 0-360, s and l 0-1

export const DEFAULT_ACCENT = '#7242ee';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Accepts "#abc", "abc", "#aabbcc" and returns "#aabbcc" (lowercase), or null if invalid.
export function normalizeHex(input: string): string | null {
  const m = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(m)) return '#' + m.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(m)) return '#' + m;
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex) ?? DEFAULT_ACCENT;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export const hexToHsl = (hex: string) => rgbToHsl(hexToRgb(hex));
export const hslToHex = (hsl: Hsl) => rgbToHex(hslToRgb(hsl));

export function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a)), lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Text color to use on top of an accent-colored button: white or near-black, whichever reads better.
export function onAccent(hex: string): string {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#0b0b14') ? '#ffffff' : '#0b0b14';
}

const BG = { dark: '#010216', light: '#f6f7fb' } as const;

// Nudges lightness until the color has at least minContrast against the app background.
// Keeps the user's hue and saturation, so it still looks like their color.
export function ensureVisible(hex: string, mode: Mode, minContrast = 3): string {
  const hsl = hexToHsl(hex);
  const step = mode === 'dark' ? 0.02 : -0.02;
  let out = hex;
  for (let i = 0; i < 50 && contrastRatio(out, BG[mode]) < minContrast; i++) {
    hsl.l = clamp(hsl.l + step, 0, 1);
    out = hslToHex(hsl);
  }
  return out;
}

export type DerivedAccent = {
  accent: string; // the color to draw with (adjusted for visibility)
  accentRgb: string; // "r g b" for the --accent CSS variable
  onAccent: string; // text color for use on accent-filled shapes
  gradient: [string, string, string]; // start, middle, end for rings and charts
  glow: string; // rgba() for shadows
  tint: (alpha: number) => string; // accent at a given opacity, for selected rows and borders
};

// Everything the UI needs, generated from the one color the user picked.
export function deriveAccent(userHex: string, mode: Mode): DerivedAccent {
  const base = normalizeHex(userHex) ?? DEFAULT_ACCENT;
  const accent = ensureVisible(base, mode);
  const { r, g, b } = hexToRgb(accent);
  const hsl = hexToHsl(accent);
  // Gray picks have no hue to shift, so keep them flat.
  const shift = (deg: number) =>
    hslToHex({ h: hsl.h + deg, s: hsl.s, l: clamp(hsl.l, 0.5, 0.65) });
  const warm = hsl.s < 0.08 ? accent : shift(30);
  const cool = hsl.s < 0.08 ? accent : shift(-45);
  return {
    accent,
    accentRgb: `${r} ${g} ${b}`,
    onAccent: onAccent(accent),
    gradient: [accent, warm, cool],
    glow: `rgba(${r}, ${g}, ${b}, 0.35)`,
    tint: (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
  };
}

export type SurfaceStyle = 'midnight' | 'matched' | 'pure';
export const SURFACE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Lightness and saturation of each step of the background ramp (light end first, dark end last).
const SURF_L = [0.975, 0.955, 0.905, 0.835, 0.66, 0.47, 0.36, 0.27, 0.19, 0.115, 0.05];
const SURF_S = [0.35, 0.3, 0.25, 0.2, 0.12, 0.1, 0.14, 0.22, 0.35, 0.5, 0.9];

// Background and surface colors for the whole app, as CSS variables --z-50 ... --z-950.
// midnight = deep navy (fixed), matched = tinted by the accent hue, pure = plain black and white.
export function deriveSurfaces(accentHex: string, style: SurfaceStyle): Record<string, string> {
  const a = hexToHsl(normalizeHex(accentHex) ?? DEFAULT_ACCENT);
  const out: Record<string, string> = {};
  SURFACE_STEPS.forEach((step, i) => {
    let l = SURF_L[i];
    let s = SURF_S[i];
    let h = 232;
    if (style === 'matched') {
      h = a.h;
      s = s * clamp(a.s * 1.1, 0, 1);
    }
    if (style === 'pure') {
      s = 0;
      if (step === 50) l = 1;
      if (step === 800) l = 0.14;
      if (step === 900) l = 0.07;
      if (step === 950) l = 0;
    }
    const { r, g, b } = hslToRgb({ h, s, l });
    out[`--z-${step}`] = `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
  });
  return out;
}
