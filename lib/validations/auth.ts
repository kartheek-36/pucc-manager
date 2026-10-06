import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateVanSchema = z.object({
  registration_number: z.string().min(3, 'Registration number must be at least 3 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  operator_id: z.string().nullable().optional(),
});

export const deviceTokenSchema = z.object({
  token: z.string().min(10, 'FCM token is required'),
  platform: z.string().optional().default('web'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  van_id: z.string().optional().nullable(),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'VAN_OPERATOR']).default('VAN_OPERATOR'),
  is_active: z.boolean().default(true),
  van_id: z.string().optional().nullable(),
});

