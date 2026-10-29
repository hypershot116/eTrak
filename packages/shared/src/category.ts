import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
  createdAt: z.number().int(), // epoch milliseconds
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(), // soft delete marker (needed for multi-device sync)
  deviceId: z.string().min(1), // device that made the last change
});

export type Category = z.infer<typeof categorySchema>;
