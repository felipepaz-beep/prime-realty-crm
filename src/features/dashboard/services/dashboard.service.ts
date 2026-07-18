import { supabase } from '@/integrations/supabase/client';

export interface DashboardMetricas {
  total_clientes: number;
  clientes_ativos: number;
  clientes_ganhos: number;
  clientes_perdidos: number;
  leads_quentes: number;
  leads_mornos: number;
  leads_frios: number;
  followups_hoje: number;
  followups_atrasados: number;
  novos_este_mes: number;
  receita_total: number;
}

export interface DashboardFunilItem {
  etapa_funil: string;
  total: number;
}

export interface FollowupPendente {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  etapa_funil: string;
  prioridade: string;
  temperatura: string;
  proximo_followup: string;
  situacao: 'hoje' | 'atrasado';
}

export interface ClienteRecente {
  id: string;
  nome: string;
  etapa_funil: string;
  temperatura: string;
  prioridade: string;
  origem_lead: string | null;
  created_at: string;
}

export async function buscarMetricas(): Promise<DashboardMetricas> {
  const { data, error } = await supabase.from('v_dashboard_metricas').select('*').single();
  if (error) throw error;
  return data as DashboardMetricas;
}

export async function buscarFunil(): Promise<DashboardFunilItem[]> {
  const { data, error } = await supabase.from('v_dashboard_funil').select('*');
  if (error) throw error;
  return (data ?? []) as DashboardFunilItem[];
}

export async function buscarFollowupsPendentes(): Promise<FollowupPendente[]> {
  const { data, error } = await supabase.from('v_dashboard_followups_pendentes').select('*');
  if (error) throw error;
  return (data ?? []) as FollowupPendente[];
}

export async function buscarClientesRecentes(): Promise<ClienteRecente[]> {
  const { data, error } = await supabase.from('v_dashboard_recentes').select('*');
  if (error) throw error;
  return (data ?? []) as ClienteRecente[];
}
