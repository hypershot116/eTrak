// Accent colors as "R G B" so Tailwind can add opacity (e.g. bg-accent/20)
export const accents = {
  indigo: '99 102 241',
  emerald: '16 185 129',
  rose: '244 63 94',
  amber: '245 158 11',
  sky: '14 165 233',
} as const;

export type AccentKey = keyof typeof accents;
