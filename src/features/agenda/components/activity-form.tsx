import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { activityFormSchema, type ActivityFormValues } from '../schemas';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPES, ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from '../constants';
import type { Activity } from '../types';

interface ActivityFormProps {
  defaultValues?: Partial<Activity>;
  clienteId?: string;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ActivityForm({ defaultValues, clienteId, onSubmit, onCancel, isLoading }: ActivityFormProps) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: defaultValues?.type ?? 'TASK',
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      status: defaultValues?.status ?? 'PENDING',
      priority: defaultValues?.priority ?? 'MEDIUM',
      client_id: clienteId ?? defaultValues?.client_id ?? '',
      scheduled_at: defaultValues?.scheduled_at ? new Date(defaultValues.scheduled_at).toISOString().slice(0, 16) : '',
      due_at: defaultValues?.due_at ? new Date(defaultValues.due_at).toISOString().slice(0, 16) : '',
      reminder_at: defaultValues?.reminder_at ? new Date(defaultValues.reminder_at).toISOString().slice(0, 16) : '',
      duration_minutes: defaultValues?.duration_minutes ?? undefined,
      location: defaultValues?.location ?? '',
      metadata: defaultValues?.metadata ?? {},
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Atividade</p><Separator /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>Tipo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem><FormLabel>Prioridade</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{(['LOW','MEDIUM','HIGH','URGENT'] as const).map((p) => <SelectItem key={p} value={p}>{ACTIVITY_PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem className="sm:col-span-2"><FormLabel>Título *</FormLabel>
              <FormControl><Input placeholder="Ex: Ligar para cliente, Visita ao imóvel..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem className="sm:col-span-2"><FormLabel>Descrição</FormLabel>
              <FormControl><Textarea placeholder="Detalhes da atividade..." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Datas e horários</p><Separator /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="scheduled_at" render={({ field }) => (
            <FormItem><FormLabel>Data/hora de início</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="due_at" render={({ field }) => (
            <FormItem><FormLabel>Prazo</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="reminder_at" render={({ field }) => (
            <FormItem><FormLabel>Lembrete</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="duration_minutes" render={({ field }) => (
            <FormItem><FormLabel>Duração (minutos)</FormLabel>
              <FormControl><Input type="number" min={1} placeholder="Ex: 60" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="space-y-1"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detalhes</p><Separator /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem><FormLabel>Local</FormLabel><FormControl><Input placeholder="Endereço ou link de reunião..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{(['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'] as const).map((s) => <SelectItem key={s} value={s}>{ACTIVITY_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? 'Salvar alterações' : 'Criar atividade'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
