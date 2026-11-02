const pad = (n: number) => String(n).padStart(2, '0');

// Local date as YYYY-MM-DD
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 0 = today, -1 = yesterday
export function dayOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateInput(d.getTime());
}

// Turns "2026-11-01" into epoch ms, keeping the time of day from timeFromMs.
// Returns null for anything that isn't a real calendar date.
export function dateInputToMs(text: string, timeFromMs: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(timeFromMs);
  const out = new Date(y, mo - 1, d, t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds());
  if (out.getFullYear() !== y || out.getMonth() !== mo - 1 || out.getDate() !== d) return null;
  return out.getTime();
}

// Start (inclusive) and end (exclusive) of a month, in epoch ms. month is 0-11.
export function monthRange(year: number, month: number): [number, number] {
  return [new Date(year, month, 1).getTime(), new Date(year, month + 1, 1).getTime()];
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}
