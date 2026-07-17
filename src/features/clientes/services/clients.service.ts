import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from './timeline.service';
import type { Cliente, ClienteFiltros, ClienteInsert, ClienteUpdate, ClientesPaginados } from '../types';

const TABLE = 'clients';

export async function listarClientes(filtros: ClienteFiltros = {}): Promise<ClientesPaginados> {
  const { busca, status, etapa_funil, prioridade, temperatura, tags, ordenarPor = 'created_at', ordem = 'desc', pagina = 1, porPagina = 20 } = filtros;

  let query = supabase.from(TABLE).select('*', { count: 'exact' }).is('deleted_at', null);

  if (busca) query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`);
  if (status?.length) query = query.in('status', status);
  if (etapa_funil?.length) query = query.in('etapa_funil', etapa_funil);
  if (prioridade?.length) query = query.in('prioridade', prioridade);
  if (temperatura?.length) query = query.in('temperatura', temperatura);
  if (tags?.length) query = query.contains('tags', tags);

  const inicio = (pagina - 1) * porPagina;
  const { data, error, count } = await query.order(ordenarPor, { ascending: ordem === 'asc' }).range(inicio, inicio + porPagina - 1);

  if (error) throw error;
  return { data: (data ?? []) as Cliente[], total: count ?? 0, pagina, porPagina };
}

export async function buscarClientePorId(id: string): Promise<Cliente> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).is('deleted_at', null).single();
  if (error) throw error;
  return data as Cliente;
}

export async function criarCliente(payload: ClienteInsert): Promise<Cliente> {
  const { data: sessionData } = await supabase.auth.getUser();
  const ownerId = sessionData.user?.id;
  if (!ownerId) throw new Error('Usuário não autenticado.');
  const { data, error } = await supabase.from(TABLE).insert({ ...payload, owner_id: ownerId } as never).select('*').single();
  if (error) throw error;
  const cliente = data as Cliente;
  // Evento automático de criação (fire-and-forget)
  TimelineService.clienteCriado(cliente.id, cliente.nome);
  return cliente;
}

export async function atualizarCliente(id: string, payload: ClienteUpdate): Promise<Cliente> {
  const { data, error } = await supabase.from(TABLE).update(payload as never).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Cliente;
}

export async function removerCliente(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function restaurarCliente(id: string): Promise<Cliente> {
  const { data, error } = await supabase.from(TABLE).update({ deleted_at: null, is_active: true }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Cliente;
}
