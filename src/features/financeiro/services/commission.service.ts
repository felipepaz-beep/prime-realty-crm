import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '@/features/clientes/services/timeline.service';
import type {
  Commission,
  CommissionFiltros,
  CommissionInsert,
  CommissionUpdate,
  CommissionsPaginadas,
  FinanceiroResumo,
  FluxoMensal,
} from '../types';

const TABLE = 'commissions';

export const CommissionService = {
  async listar(filtros: CommissionFiltros = {}): Promise<CommissionsPaginadas> {
    const { status, busca, pagina = 1, porPagina = 20 } = filtros;
    let query = supabase
      .from(TABLE)
      .select('*, client:clients(id, nome)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (busca) query = query.or(`property_code.ilike.%${busca}%,notes.ilike.%${busca}%`);

    const inicio = (pagina - 1) * porPagina;
    const { data, error, count } = await query
      .order('expected_date', { ascending: false, nullsFirst: false })
      .range(inicio, inicio + porPagina - 1);

    if (error) throw error;
    return {
      data: (data ?? []) as unknown as Commission[],
      total: count ?? 0,
      pagina,
      porPagina,
    };
  },

  async criar(payload: Omit<CommissionInsert, 'owner_id'>): Promise<Commission> {
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) throw new Error('Usuário não autenticado.');
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...payload, owner_id: ownerId } as never)
      .select('*, client:clients(id, nome)')
      .single();
    if (error) throw error;
    const commission = data as unknown as Commission;
    if (commission.client_id) {
      TimelineService.vendaConcluida(commission.client_id, commission.gross_value, commission.payment_method ?? undefined);
    }
    return commission;
  },

  async atualizar(id: string, payload: CommissionUpdate): Promise<Commission> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload as never)
      .eq('id', id)
      .select('*, client:clients(id, nome)')
      .single();
    if (error) throw error;
    return data as unknown as Commission;
  },

  async marcarRecebida(id: string): Promise<Commission> {
    const result = await this.atualizar(id, {
      status: 'recebida',
      received_date: new Date().toISOString().slice(0, 10),
    });
    if (result.client_id) {
      TimelineService.eventoCustomizado(
        result.client_id,
        'Comissão recebida',
        `Valor: R$ ${result.commission_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'negocio',
      );
    }
    return result;
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async resumo(): Promise<FinanceiroResumo | null> {
    const { data, error } = await supabase
      .from('v_financeiro_resumo')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as FinanceiroResumo) ?? null;
  },

  async fluxoMensal(): Promise<FluxoMensal[]> {
    const { data, error } = await supabase
      .from('v_fluxo_mensal')
      .select('*')
      .order('mes', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as FluxoMensal[];
  },
};
