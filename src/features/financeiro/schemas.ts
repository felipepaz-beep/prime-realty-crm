import { z } from 'zod';

export const commissionSchema = z
  .object({
    client_id: z.string().uuid().nullable().optional(),
    property_code: z.string().trim().max(50).nullable().optional(),
    gross_value: z.coerce.number().min(0, 'Informe o valor bruto'),
    commission_percentage: z.coerce.number().min(0).max(100),
    commission_value: z.coerce.number().min(0),
    status: z.enum(['prevista', 'recebida', 'atrasada', 'cancelada']).default('prevista'),
    expected_date: z.string().nullable().optional(),
    received_date: z.string().nullable().optional(),
    payment_method: z
      .enum(['pix', 'ted', 'transferencia', 'boleto', 'cheque', 'dinheiro', 'outro'])
      .nullable()
      .optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((v) => v.status !== 'recebida' || !!v.received_date, {
    message: 'Informe a data de recebimento',
    path: ['received_date'],
  });

export type CommissionFormValues = z.infer<typeof commissionSchema>;

export const goalSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2100),
  goal_value: z.coerce.number().min(0),
  goal_sales: z.coerce.number().int().min(0),
  goal_commission: z.coerce.number().min(0),
});

export type GoalFormValues = z.infer<typeof goalSchema>;
