const pad = (n: number) => String(n).padStart(2, '0');

// Local date as YYYY-MM-DD
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 0 = today, -1 = yesterday, 1 = tomorrow
export function dayOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateInput(d.getTime());
}

// Turns "2026-11-01" into epoch ms, keeping the time of day from timeFromMs.
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

// Accepts either (year, month) or "YYYY-MM-DD"
export function monthLabel(arg1: number | string, arg2?: number): string {
  if (typeof arg1 === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arg1)) return '';
    const { y, m } = parseDateParts(arg1);
    return new Date(y, m, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }
  return new Date(arg1, arg2 ?? 0, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

// "Today", "Yesterday", "Tomorrow", or e.g. "Monday, Nov 2"
export function dayLabel(ms: number): string {
  const key = toDateInput(ms);
  if (key === dayOffset(0)) return 'Today';
  if (key === dayOffset(-1)) return 'Yesterday';
  if (key === dayOffset(1)) return 'Tomorrow';
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// "2026-11-04" -> { y: 2026, m: 10 (0-11), d: 4 }
export function parseDateParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m: m - 1, d };
}

// Adds (or subtracts) whole days to a YYYY-MM-DD string.
export function addDays(dateStr: string, delta: number): string {
  const { y, m, d } = parseDateParts(dateStr);
  return toDateInput(new Date(y, m, d + delta, 12).getTime());
}

// "Wednesday"
export function weekdayName(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const { y, m, d } = parseDateParts(dateStr);
  return new Date(y, m, d, 12).toLocaleDateString(undefined, { weekday: 'long' });
}

// "Nov 4, 2026"
export function shortDateLabel(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const { y, m, d } = parseDateParts(dateStr);
  return new Date(y, m, d, 12).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// "Today", "Yesterday", "Tomorrow", "5 days ago", "In 3 days"
export function relativeDayTag(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const a = parseDateParts(dateStr);
  const b = parseDateParts(dayOffset(0));
  const n = Math.round((Date.UTC(a.y, a.m, a.d) - Date.UTC(b.y, b.m, b.d)) / 86400000);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n === 1) return 'Tomorrow';
  return n < 0 ? `${-n} days ago` : `In ${n} days`;
}
