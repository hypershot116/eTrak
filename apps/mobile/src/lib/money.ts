import { getCurrency } from './currencies';

// "12.5" with digits=2 -> 1250. Returns null when the text is not a valid amount.
export function parseAmountToMinor(input: string, digits: number): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  if (frac.length > digits) return null;
  const minor = Number(whole + frac.padEnd(digits, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}

// 1250 + "USD" -> "USD 12.50"
export function formatMinor(minor: number, code: string): string {
  const c = getCurrency(code);
  const value = (minor / 10 ** c.digits).toLocaleString(undefined, {
    minimumFractionDigits: c.digits,
    maximumFractionDigits: c.digits,
  });
  return `${c.code} ${value}`;
}
