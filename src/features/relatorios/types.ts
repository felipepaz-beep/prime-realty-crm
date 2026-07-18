export interface AnalyticsKPIs {
  total_clientes: number;
  clientes_ativos: number;
  vendas_concluidas: number;
  leads_perdidos: number;
  novos_este_mes: number;
  score_medio: number;
  visitas_agendadas: number;
  propostas_enviadas: number;
  em_negociacao: number;
  followups_atrasados: number;
  taxa_conversao_geral: number;
}

export interface FunilConversao {
  etapa_funil: string;
  total: number;
  convertidos: number;
  pct_total: number;
  taxa_conversao: number;
}

export interface OrigemLead {
  origem: string;
  total: number;
  convertidos: number;
  taxa_conversao: number;
}

export interface AtividadeAnalytics {
  type: string;
  status: string;
  total: number;
  atrasadas: number;
}

export interface DocumentoAnalytics {
  category: string;
  total: number;
  total_bytes: number;
  favoritos: number;
}

export interface ConversaAnalytics {
  channel: string;
  status: string;
  total: number;
  mensagens_nao_lidas: number;
}

export interface TimelineEvento {
  category: string;
  event_type: string;
  mes: string;
  total: number;
}

export interface DateRange { start: string; end: string; }

export interface ReportFiltros {
  dateRange?: DateRange;
  clientId?: string;
  status?: string;
  origem?: string;
}

export const RELATORIO_TYPES = [
  { id: 'executivo',    label: 'Resumo Executivo',   icon: 'LayoutDashboard' },
  { id: 'funil',        label: 'Funil de Vendas',    icon: 'TrendingUp' },
  { id: 'clientes',     label: 'Clientes',           icon: 'Users' },
  { id: 'origem',       label: 'Origem dos Leads',   icon: 'Target' },
  { id: 'atividades',   label: 'Agenda e Atividades',icon: 'Calendar' },
  { id: 'documentos',   label: 'Documentos',         icon: 'FileText' },
  { id: 'comunicacao',  label: 'Comunicação',        icon: 'MessageCircle' },
  { id: 'ia',           label: 'Uso da IA',          icon: 'Sparkles' },
] as const;

export type RelatorioType = typeof RELATORIO_TYPES[number]['id'];
