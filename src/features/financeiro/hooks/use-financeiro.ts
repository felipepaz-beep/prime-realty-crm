import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CommissionService } from '../services/commission.service';
import { GoalService } from '../services/goal.service';
import type {
  CommissionFiltros,
  CommissionInsert,
  CommissionUpdate,
} from '../types';
import type { GoalFormValues } from '../schemas';

const K = {
  resumo: ['financeiro', 'resumo'] as const,
  fluxo: ['financeiro', 'fluxo'] as const,
  commissions: (f: CommissionFiltros) => ['financeiro', 'commissions', f] as const,
  goal: (month: number, year: number) => ['financeiro', 'goal', month, year] as const,
};

export function useFinanceiroResumo() {
  return useQuery({ queryKey: K.resumo, queryFn: () => CommissionService.resumo() });
}

export function useFluxoMensal() {
  return useQuery({ queryKey: K.fluxo, queryFn: () => CommissionService.fluxoMensal() });
}

export function useCommissions(filtros: CommissionFiltros = {}) {
  return useQuery({
    queryKey: K.commissions(filtros),
    queryFn: () => CommissionService.listar(filtros),
  });
}

function invalidarTudo(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['financeiro'] });
}

export function useCriarComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CommissionInsert, 'owner_id'>) => CommissionService.criar(payload),
    onSuccess: () => {
      invalidarTudo(qc);
      toast.success('Comissão criada');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao criar comissão'),
  });
}

export function useAtualizarComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CommissionUpdate }) =>
      CommissionService.atualizar(id, payload),
    onSuccess: () => {
      invalidarTudo(qc);
      toast.success('Comissão atualizada');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao atualizar'),
  });
}

export function useMarcarRecebida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; clientId?: string | null }) =>
      CommissionService.marcarRecebida(id),
    onSuccess: () => {
      invalidarTudo(qc);
      toast.success('Comissão marcada como recebida');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao marcar'),
  });
}

export function useRemoverComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CommissionService.remover(id),
    onSuccess: () => {
      invalidarTudo(qc);
      toast.success('Comissão removida');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao remover'),
  });
}

export function useGoalMes(month: number, year: number) {
  return useQuery({
    queryKey: K.goal(month, year),
    queryFn: () => GoalService.buscar(month, year),
  });
}

export function useSalvarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: GoalFormValues) => GoalService.salvar(values),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: K.goal(data.month, data.year) });
      toast.success('Meta salva');
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao salvar meta'),
  });
}
