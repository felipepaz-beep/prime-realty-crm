import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

import { clienteFormSchema, type ClienteFormValues } from '../schemas';
import type { Cliente } from '../types';

interface ClienteFormProps {
  defaultValues?: Partial<Cliente>;
  onSubmit: (values: ClienteFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClienteForm({ defaultValues, onSubmit, onCancel, isLoading }: ClienteFormProps) {
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      nome: defaultValues?.nome ?? '',
      telefone: defaultValues?.telefone ?? '',
      whatsapp: defaultValues?.whatsapp ?? '',
      email: defaultValues?.email ?? '',
      cidade: defaultValues?.cidade ?? '',
      estado: defaultValues?.estado ?? '',
      origem_lead: defaultValues?.origem_lead ?? '',
      status: defaultValues?.status ?? 'ativo',
      etapa_funil: defaultValues?.etapa_funil ?? 'novo_lead',
      prioridade: defaultValues?.prioridade ?? 'media',
      temperatura: defaultValues?.temperatura ?? 'morno',
      score: defaultValues?.score ?? 0,
      observacoes: defaultValues?.observacoes ?? '',
      tags: defaultValues?.tags ?? [],
      custom_fields: defaultValues?.custom_fields ?? {},
      bairros_interesse: defaultValues?.bairros_interesse ?? [],
      cidades_interesse: defaultValues?.cidades_interesse ?? [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dados pessoais</p>
          <Separator />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="nome" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Nome completo *</FormLabel>
              <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="telefone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl><Input placeholder="(51) 9 9999-9999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="whatsapp" render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl><Input placeholder="(51) 9 9999-9999" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>E-mail</FormLabel>
              <FormControl><Input type="email" placeholder="cliente@email.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="cidade" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl><Input placeholder="Porto Alegre" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="estado" render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <FormControl><Input placeholder="RS" maxLength={2} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pipeline</p>
          <Separator />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="etapa_funil" render={({ field }) => (
            <FormItem>
              <FormLabel>Etapa do funil</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="novo_lead">Novo lead</SelectItem>
                  <SelectItem value="contato_iniciado">Contato iniciado</SelectItem>
                  <SelectItem value="qualificacao">Qualificação</SelectItem>
                  <SelectItem value="visita_agendada">Visita agendada</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado_ganho">Fechado (ganho)</SelectItem>
                  <SelectItem value="fechado_perdido">Fechado (perdido)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="temperatura" render={({ field }) => (
            <FormItem>
              <FormLabel>Temperatura</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="frio">🧊 Frio</SelectItem>
                  <SelectItem value="morno">🌡️ Morno</SelectItem>
                  <SelectItem value="quente">🔥 Quente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="prioridade" render={({ field }) => (
            <FormItem>
              <FormLabel>Prioridade</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="origem_lead" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem do lead</FormLabel>
              <FormControl><Input placeholder="Ex: Indicação, Instagram..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observações</p>
          <Separator />
        </div>

        <FormField control={form.control} name="observacoes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl>
              <Textarea placeholder="Anotações sobre o cliente..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
