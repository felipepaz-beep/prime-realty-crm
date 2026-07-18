import { supabase } from '@/integrations/supabase/client';

export interface DashboardMetricas {
  total_clientes: number; clientes_ativos: number; clientes_ganhos: number; clientes_perdidos: number;
  leads_quentes: number; leads_mornos: number; leads_frios: number;
  followups_hoje: number; followups_atrasados: number; novos_este_mes: number; receita_total: number;
}
export interface DashboardFunilItem { etapa_funil: string; total: number; }
export interface FollowupPendente {
  id: string; nome: string; telefone: string | null; whatsapp: string | null;
  etapa_funil: string; prioridade: string; temperatura: string; proximo_followup: string; situacao: 'hoje' | 'atrasado';
}
export interface ClienteRecente {
  id: string; nome: string; etapa_funil: string; temperatura: string; prioridade: string; origem_lead: string | null; created_at: string;
}
export interface ClientePrioritario {
  id: string; nome: string; telefone: string | null; whatsapp: string | null; email: string | null;
  etapa_funil: string; prioridade: string; temperatura: string; score: number;
  ultimo_contato: string | null; proximo_followup: string | null; origem_lead: string | null; status: string;
}
export interface AtividadesHoje {
  total_hoje: number; tarefas_hoje: number; followups_hoje: number; visitas_hoje: number; atrasadas: number;
}
export interface DashboardIndicadores {
  leads_captacao: number; leads_contato: number; leads_qualificados: number; leads_visita: number;
  leads_proposta: number; leads_negociacao: number; leads_ganhos: number; leads_perdidos: number;
  receita_potencial: number; leads_com_origem: number; clientes_inativos: number; score_medio: number;
}
export interface AtividadeDashboard {
  id: string; type: string; title: string; description: string | null; status: string; priority: string;
  scheduled_at: string | null; due_at: string | null; client_id: string | null; client?: { nome: string } | null;
}
export interface ResultadoPesquisa {
  id: string; nome: string; telefone: string | null; whatsapp: string | null; email: string | null;
  etapa_funil: string; status: string; codigo_imovel: string | null;
}

export async function buscarMetricas(): Promise<DashboardMetricas> {
  const { data, error } = await supabase.from('v_dashboard_metricas').select('*').single();
  if (error) throw error; return data as DashboardMetricas;
}
export async function buscarFunil(): Promise<DashboardFunilItem[]> {
  const { data, error } = await supabase.from('v_dashboard_funil').select('*');
  if (error) throw error; return (data ?? []) as DashboardFunilItem[];
}
export async function buscarFollowupsPendentes(): Promise<FollowupPendente[]> {
  const { data, error } = await supabase.from('v_dashboard_followups_pendentes').select('*');
  if (error) throw error; return (data ?? []) as FollowupPendente[];
}
export async function buscarClientesRecentes(): Promise<ClienteRecente[]> {
  const { data, error } = await supabase.from('v_dashboard_recentes').select('*');
  if (error) throw error; return (data ?? []) as ClienteRecente[];
}
export async function buscarClientesPrioritarios(): Promise<ClientePrioritario[]> {
  const { data, error } = await supabase.from('v_dashboard_prioritarios').select('*');
  if (error) throw error; return (data ?? []) as ClientePrioritario[];
}
export async function buscarAtividadesHoje(): Promise<AtividadesHoje> {
  const { data, error } = await supabase.from('v_dashboard_atividades_hoje').select('*').single();
  if (error) throw error;
  return (data ?? { total_hoje: 0, tarefas_hoje: 0, followups_hoje: 0, visitas_hoje: 0, atrasadas: 0 }) as AtividadesHoje;
}
export async function buscarIndicadores(): Promise<DashboardIndicadores> {
  const { data, error } = await supabase.from('v_dashboard_indicadores').select('*').single();
  if (error) throw error; return data as DashboardIndicadores;
}
export async function buscarAtividadesDoDia(): Promise<AtividadeDashboard[]> {
  const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
  const fim = new Date(); fim.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('activities')
    .select('id,type,title,description,status,priority,scheduled_at,due_at,client_id,client:clients(nome)')
    .is('deleted_at', null)
    .not('status', 'in', '("COMPLETED","CANCELLED")')
    .gte('scheduled_at', inicio.toISOString())
    .lte('scheduled_at', fim.toISOString())
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(20);
  if (error) throw error; return (data ?? []) as AtividadeDashboard[];
}
export async function buscarAtividadesAtrasadas(): Promise<AtividadeDashboard[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('id,type,title,description,status,priority,scheduled_at,due_at,client_id,client:clients(nome)')
    .is('deleted_at', null)
    .not('status', 'in', '("COMPLETED","CANCELLED")')
    .lt('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(10);
  if (error) throw error; return (data ?? []) as AtividadeDashboard[];
}
export async function pesquisarGlobal(termo: string): Promise<ResultadoPesquisa[]> {
  if (!termo || termo.trim().length < 2) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id,nome,telefone,whatsapp,email,etapa_funil,status,codigo_imovel')
    .is('deleted_at', null)
    .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%,whatsapp.ilike.%${termo}%,email.ilike.%${termo}%,codigo_imovel.ilike.%${termo}%`)
    .limit(8);
  if (error) throw error; return (data ?? []) as ResultadoPesquisa[];
}
