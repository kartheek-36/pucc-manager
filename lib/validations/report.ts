import { z } from 'zod';

export const dailyReportSchema = z.object({
  report_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Report date must be in YYYY-MM-DD format'),
  van_id: z.string().min(1, 'Van is required'),
  petrol_tests: z.coerce
    .number()
    .int('Petrol tests must be an integer')
    .min(0, 'Petrol tests cannot be negative'),
  diesel_tests: z.coerce
    .number()
    .int('Diesel tests must be an integer')
    .min(0, 'Diesel tests cannot be negative'),
  other_tests: z.coerce
    .number()
    .int('Other tests must be an integer')
    .min(0, 'Other tests cannot be negative'),
  total_tests: z.coerce
    .number()
    .int('Total tests must be an integer')
    .min(0, 'Total tests cannot be negative'),
  total_collection: z.coerce
    .number()
    .min(0, 'Total collection cannot be negative'),
  expenses: z.coerce
    .number()
    .min(0, 'Expenses cannot be negative')
    .default(0),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional().nullable(),
}).refine(
  (data) => data.total_tests === data.petrol_tests + data.diesel_tests + data.other_tests,
  {
    message: 'Total tests must equal the sum of Petrol, Diesel, and Other tests',
    path: ['total_tests'],
  }
);

export type DailyReportInput = z.infer<typeof dailyReportSchema>;

export const reportStatusUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  notes: z.string().optional().nullable(),
});
