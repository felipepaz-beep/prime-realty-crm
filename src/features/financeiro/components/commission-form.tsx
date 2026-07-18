import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { commissionSchema, type CommissionFormValues } from '../schemas';
import {
  COMMISSION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type Commission,
} from '../types';

type Props = {
  onSubmit: (values: CommissionFormValues) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultValues?: Commission | null;
};

export function CommissionForm({ onSubmit, onCancel, isLoading, defaultValues }: Props) {
  const form = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      client_id: defaultValues?.client_id ?? null,
      property_code: defaultValues?.property_code ?? '',
      gross_value: Number(defaultValues?.gross_value ?? 0),
      commission_percentage: Number(defaultValues?.commission_percentage ?? 0),
      commission_value: Number(defaultValues?.commission_value ?? 0),
      status: defaultValues?.status ?? 'prevista',
      expected_date: defaultValues?.expected_date ?? '',
      received_date: defaultValues?.received_date ?? '',
      payment_method: defaultValues?.payment_method ?? null,
      notes: defaultValues?.notes ?? '',
    },
  });

  // Cálculo automático da comissão a partir de bruto × percentual
  const bruto = form.watch('gross_value');
  const perc = form.watch('commission_percentage');
  useEffect(() => {
    const calc = Number(((Number(bruto) || 0) * (Number(perc) || 0)) / 100);
    form.setValue('commission_value', Number(calc.toFixed(2)), { shouldValidate: false });
  }, [bruto, perc, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="property_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do imóvel</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: AP-1234" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(COMMISSION_STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="gross_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor bruto (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commission_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} max={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commission_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expected_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data prevista</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="received_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de recebimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de pagamento</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
