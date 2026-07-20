import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsKPIs, AtividadeAnalytics, ConversaAnalytics, DocumentoAnalytics, FunilConversao, OrigemLead, TimelineEvento } from '../types';
import type { Commission, FinanceiroResumo } from '@/features/financeiro/types';

const db = supabase as any;

export const AnalyticsService = {
  async getKPIs(): Promise<AnalyticsKPIs> {
    const { data, error } = await db.from('v_analytics_kpis').select('*').single();
    if (error) throw error;
    return (data as unknown) as AnalyticsKPIs;
  },
  async getFunilConversao(): Promise<FunilConversao[]> {
    const { data, error } = await db.from('v_analytics_funil_conversao').select('*');
    if (error) throw error;
    return ((data as unknown) ?? []) as FunilConversao[];
  },
  async getOrigemLeads(): Promise<OrigemLead[]> {
    const { data, error } = await db.from('v_analytics_origem_leads').select('*');
    if (error) throw error;
    return ((data as unknown) ?? []) as OrigemLead[];
  },
  async getAtividades(): Promise<AtividadeAnalytics[]> {
    const { data, error } = await db.from('v_analytics_atividades').select('*');
    if (error) throw error;
    return ((data as unknown) ?? []) as AtividadeAnalytics[];
  },
  async getDocumentos(): Promise<DocumentoAnalytics[]> {
    const { data, error } = await db.from('v_analytics_documentos').select('*');
    if (error) throw error;
    return ((data as unknown) ?? []) as DocumentoAnalytics[];
  },
  async getConversas(): Promise<ConversaAnalytics[]> {
    const { data, error } = await db.from('v_analytics_conversas').select('*');
    if (error) throw error;
    return ((data as unknown) ?? []) as ConversaAnalytics[];
  },
  async getTimelineEventos(meses = 6): Promise<TimelineEvento[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - meses);
    const { data, error } = await db
      .from('v_analytics_timeline_eventos').select('*')
      .gte('mes', since.toISOString().split('T')[0]);
    if (error) throw error;
    return ((data as unknown) ?? []) as TimelineEvento[];
  },
  async getFinanceiro(): Promise<{ comissoes: Commission[]; resumo: FinanceiroResumo | null }> {
    const [comissoesResult, resumoResult] = await Promise.allSettled([
      supabase.from('commissions').select('*, client:clients(nome)').order('expected_date', { ascending: false }).limit(50),
      supabase.from('v_financeiro_resumo').select('*').maybeSingle(),
    ]);
    return {
      comissoes: comissoesResult.status === 'fulfilled' ? ((comissoesResult.value.data ?? []) as unknown as Commission[]) : [],
      resumo: resumoResult.status === 'fulfilled' ? ((resumoResult.value.data as unknown) as FinanceiroResumo | null) : null,
    };
  },
};

export const ReportsService = {
  toCSV(data: Record<string, unknown>[], headers?: Record<string, string>): string {
    if (!data.length) return '';
    const keys = Object.keys(data[0]);
    const headerRow = keys.map((k) => headers?.[k] ?? k).join(',');
    const rows = data.map((row) =>
      keys.map((k) => {
        const val = row[k];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') ? `"${str}"` : str;
      }).join(','),
    );
    return [headerRow, ...rows].join('\n');
  },
  downloadCSV(csv: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  },
  print(): void { window.print(); },
};

export const MetricsService = {
  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  },
  formatarBytes(bytes: number): string {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
    return `${bytes} B`;
  },
  formatarPct(valor: number): string { return `${(valor ?? 0).toFixed(1)}%`; },
  tendencia(atual: number, anterior: number): 'up' | 'down' | 'flat' {
    if (atual > anterior) return 'up';
    if (atual < anterior) return 'down';
    return 'flat';
  },
};
