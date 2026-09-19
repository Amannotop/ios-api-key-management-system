import { z } from 'zod';

export const checkValidationSchema = z.object({
  udid: z.string().min(1, 'UDID is required'),
  key: z.string().min(1, 'Key is required'),
  lockdevice: z.string().min(1, 'Bundle ID is required'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createKeySchema = z.object({
  expiresAt: z.string().datetime(),
  maxDevices: z.number().int().min(1).max(100).default(1),
});

export const updateKeySchema = z.object({
  expiresAt: z.string().datetime().optional(),
  maxDevices: z.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'expired', 'banned']).optional(),
});

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'expired', 'banned']).optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: { body: unknown; res: unknown; json: (data: unknown) => void; status: (code: number) => { json: (data: unknown) => void } }, _res: unknown, next: () => void) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
      return;
    }
    next();
  };
}