import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '@/features/clientes/services/timeline.service';
import { CalendarService, activityToCalendarPayload } from './calendar.service';
import type { Activity, ActivitiesPaginadas, ActivityFiltros, ActivityInsert, ActivityUpdate } from '../types';

const TABLE = 'activities';

export async function listarActivities(filtros: ActivityFiltros = {}): Promise<ActivitiesPaginadas> {
  const {
    type, status, priority, client_id, dateStart, dateEnd,
    busca, ordenarPor = 'scheduled_at', ordem = 'asc', pagina = 1, porPagina = 20,
  } = filtros;

  let query = supabase.from(TABLE).select('*, client:clients(nome)', { count: 'exact' }).is('deleted_at', null);

  if (type?.length)     query = query.in('type', type);
  if (status?.length)   query = query.in('status', status);
  if (priority?.length) query = query.in('priority', priority);
  if (client_id)        query = query.eq('client_id', client_id);
  if (dateStart)        query = query.gte('scheduled_at', dateStart);
  if (dateEnd)          query = query.lte('scheduled_at', dateEnd);
  if (busca)            query = query.or(`title.ilike.%${busca}%,description.ilike.%${busca}%`);

  const inicio = (pagina - 1) * porPagina;
  const { data, error, count } = await query
    .order(ordenarPor, { ascending: ordem === 'asc', nullsFirst: false })
    .range(inicio, inicio + porPagina - 1);

  if (error) throw error;
  return { data: (data ?? []) as Activity[], total: count ?? 0, pagina, porPagina };
}

export async function buscarActivityPorId(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from(TABLE).select('*, client:clients(nome)').eq('id', id).is('deleted_at', null).single();
  if (error) throw error;
  return data as Activity;
}

export async function criarActivity(payload: ActivityInsert): Promise<Activity> {
  const { data: sessionData } = await supabase.auth.getUser();
  const ownerId = sessionData.user?.id;
  if (!ownerId) throw new Error('Usuário não autenticado.');

  const { data, error } = await supabase
    .from(TABLE).insert({ ...payload, owner_id: ownerId } as never)
    .select('*, client:clients(nome)').single();
  if (error) throw error;

  const activity = data as Activity;

  if (activity.client_id) {
    if (activity.type === 'TASK') {
      TimelineService.tarefaCriada(activity.client_id, activity.id, activity.title);
    } else if (activity.type === 'FOLLOWUP') {
      TimelineService.followupCriado(activity.client_id, activity.scheduled_at ?? activity.due_at ?? new Date().toISOString());
    } else if (activity.type === 'VISIT') {
      TimelineService.visitaAgendada(activity.client_id, activity.metadata?.property_code as string | undefined, activity.description ?? undefined);
    }
  }

  if (activity.scheduled_at || activity.due_at) {
    CalendarService.createEvent(activityToCalendarPayload(activity))
      .then((externalId) => {
        if (!externalId) return;
        supabase.from(TABLE).update({ metadata: { ...activity.metadata, google_calendar_event_id: externalId, google_calendar_synced_at: new Date().toISOString() } }).eq('id', activity.id);
      })
      .catch(() => {});
  }

  return activity;
}

export async function atualizarActivity(id: string, payload: ActivityUpdate): Promise<Activity> {
  const { data, error } = await supabase
    .from(TABLE).update(payload as never).eq('id', id)
    .select('*, client:clients(nome)').single();
  if (error) throw error;
  return data as Activity;
}

export async function concluirActivity(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from(TABLE).update({ status: 'COMPLETED', completed_at: new Date().toISOString() } as never)
    .eq('id', id).select('*, client:clients(nome)').single();
  if (error) throw error;

  const concluida = data as Activity;
  if (concluida.client_id) {
    if (concluida.type === 'TASK')     TimelineService.tarefaConcluida(concluida.client_id, concluida.id, concluida.title);
    if (concluida.type === 'FOLLOWUP') TimelineService.followupRealizado(concluida.client_id, concluida.description ?? undefined);
    if (concluida.type === 'VISIT')    TimelineService.visitaRealizada(concluida.client_id, concluida.metadata?.property_code as string | undefined, concluida.description ?? undefined);
    if (concluida.type === 'CALL')     TimelineService.ligacaoRealizada(concluida.client_id, concluida.description ?? undefined);
  }
  return concluida;
}

export async function cancelarActivity(id: string): Promise<Activity> {
  const { data, error } = await supabase
    .from(TABLE).update({ status: 'CANCELLED' } as never).eq('id', id)
    .select('*, client:clients(nome)').single();
  if (error) throw error;
  return data as Activity;
}

export async function duplicarActivity(id: string): Promise<Activity> {
  const original = await buscarActivityPorId(id);
  const { id: _, created_at: __, updated_at: ___, completed_at: ____, client: _____, ...resto } = original;
  return criarActivity({ ...resto, title: `${original.title} (cópia)`, status: 'PENDING', completed_at: null });
}

export async function removerActivity(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) throw error;
}
