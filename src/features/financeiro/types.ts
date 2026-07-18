import type { Database } from '@/integrations/supabase/types';

export type Commission = Database['public']['Tables']['commissions']['Row'] & {
  client?: { id: string; nome: string } | null;
};
export type CommissionInsert = Database['public']['Tables']['commissions']['Insert'];
export type CommissionUpdate = Database['public']['Tables']['commissions']['Update'];

export type Goal = Database['public']['Tables']['goals']['Row'];
export type GoalInsert = Database['public']['Tables']['goals']['Insert'];
export type GoalUpdate = Database['public']['Tables']['goals']['Update'];

export type CommissionStatus = Database['public']['Enums']['commission_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];

export type FinanceiroResumo = {
  owner_id: string;
  previsto_total: number;
  recebido_total: number;
  atrasado_total: number;
  recebido_mes_atual: number;
  previsto_mes_atual: number;
  qtd_recebidas: number;
  qtd_previstas: number;
};

export type FluxoMensal = {
  owner_id: string;
  mes: string; // YYYY-MM
  realizado: number;
  previsto: number;
};

export type CommissionFiltros = {
  status?: CommissionStatus;
  busca?: string;
  pagina?: number;
  porPagina?: number;
};

export type CommissionsPaginadas = {
  data: Commission[];
  total: number;
  pagina: number;
  porPagina: number;
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  prevista: 'Prevista',
  recebida: 'Recebida',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
};

export const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  prevista: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  recebida: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  atrasada: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  cancelada: 'bg-muted text-muted-foreground border-border',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  ted: 'TED',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  cheque: 'Cheque',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};
