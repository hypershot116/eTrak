import { z } from 'zod';
import { currencyCodeSchema } from './currency';

export const expenseSchema = z.object({
  id: z.string().min(1),
  amountMinor: z.number().int().positive(), // minor units, e.g. cents (1250 = 12.50)
  currency: currencyCodeSchema,
  rateToMain: z.number().positive(), // exchange rate to the main currency when saved
  categoryId: z.string().min(1),
  note: z.string().max(200).default(''),
  spentAt: z.number().int(), // when the money was spent (epoch ms)
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
  deviceId: z.string().min(1),
});

export type Expense = z.infer<typeof expenseSchema>;
