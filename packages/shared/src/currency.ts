import { z } from 'zod';

// ISO 4217 code, e.g. "USD", "BDT", "EUR"
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/);

export type CurrencyCode = z.infer<typeof currencyCodeSchema>;
