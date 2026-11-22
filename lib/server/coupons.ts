import { z } from 'zod';

const optionalDate = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.date().nullable()
);

export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(30).regex(/^[A-Z0-9_-]+$/, 'Code may contain A-Z, 0-9, - and _'),
  description: z.string().trim().max(200).default(''),
  discountType: z.enum(['PERCENT', 'FLAT']),
  discountValue: z.coerce.number().int().positive(),
  maxDiscount: z.preprocess((v) => (v === '' || v === 0 || v === undefined ? null : v), z.coerce.number().int().positive().nullable()),
  minOrderValue: z.coerce.number().int().min(0).default(0),
  usageLimit: z.preprocess((v) => (v === '' || v === 0 || v === undefined ? null : v), z.coerce.number().int().positive().nullable()),
  startsAt: optionalDate,
  expiresAt: optionalDate,
  isActive: z.boolean().default(true)
}).refine((c) => c.discountType !== 'PERCENT' || c.discountValue <= 100, { message: 'Percentage cannot exceed 100', path: ['discountValue'] })
  .refine((c) => !c.startsAt || !c.expiresAt || c.expiresAt > c.startsAt, { message: 'Expiry must be after the start date', path: ['expiresAt'] });
