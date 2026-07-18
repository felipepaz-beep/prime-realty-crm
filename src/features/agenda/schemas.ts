import { z } from 'zod';

export const activityTypeSchema = z.enum(['TASK','FOLLOWUP','VISIT','CALL','MEETING','EMAIL','PERSONAL']);
export const activityStatusSchema = z.enum(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED']);
export const activityPrioritySchema = z.enum(['LOW','MEDIUM','HIGH','URGENT']);

export const activityFormSchema = z.object({
  type: activityTypeSchema,
  title: z.string().trim().min(2, 'Informe um título'),
  description: z.string().trim().optional().or(z.literal('')),
  status: activityStatusSchema.default('PENDING'),
  priority: activityPrioritySchema.default('MEDIUM'),
  client_id: z.string().uuid().optional().or(z.literal('')),
  scheduled_at: z.string().optional().or(z.literal('')),
  due_at: z.string().optional().or(z.literal('')),
  reminder_at: z.string().optional().or(z.literal('')),
  duration_minutes: z.number().int().positive().optional(),
  location: z.string().trim().optional().or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).refine(
  (d) => !d.scheduled_at || !d.due_at || new Date(d.scheduled_at) <= new Date(d.due_at),
  { message: 'Data de início não pode ser após o prazo', path: ['due_at'] },
);

export type ActivityFormValues = z.input<typeof activityFormSchema>;
