import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { atualizarActivity, buscarActivityPorId, cancelarActivity, concluirActivity, criarActivity, duplicarActivity, listarActivities, removerActivity } from '../services/activity.service';
import type { ActivityFiltros, ActivityInsert, ActivityUpdate } from '../types';

export const activitiesKeys = {
  all: ['activities'] as const,
  lists: () => [...activitiesKeys.all, 'list'] as const,
  list: (filtros: ActivityFiltros) => [...activitiesKeys.lists(), filtros] as const,
  details: () => [...activitiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...activitiesKeys.details(), id] as const,
};

export function useActivities(filtros: ActivityFiltros = {}) {
  return useQuery({ queryKey: activitiesKeys.list(filtros), queryFn: () => listarActivities(filtros) });
}

export function useActivityDetalhe(id: string) {
  return useSuspenseQuery({ queryKey: activitiesKeys.detail(id), queryFn: () => buscarActivityPorId(id) });
}

function useInvalidateLists() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: activitiesKeys.lists() });
}

export function useCriarActivity() {
  const invalidate = useInvalidateLists();
  return useMutation({ mutationFn: (p: ActivityInsert) => criarActivity(p), onSuccess: invalidate });
}

export function useAtualizarActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: ActivityUpdate) => atualizarActivity(id, p),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: activitiesKeys.lists() }); qc.setQueryData(activitiesKeys.detail(id), data); },
  });
}

export function useConcluirActivity() {
  const invalidate = useInvalidateLists();
  return useMutation({ mutationFn: (id: string) => concluirActivity(id), onSuccess: invalidate });
}

export function useCancelarActivity() {
  const invalidate = useInvalidateLists();
  return useMutation({ mutationFn: (id: string) => cancelarActivity(id), onSuccess: invalidate });
}

export function useDuplicarActivity() {
  const invalidate = useInvalidateLists();
  return useMutation({ mutationFn: (id: string) => duplicarActivity(id), onSuccess: invalidate });
}

export function useRemoverActivity() {
  const invalidate = useInvalidateLists();
  return useMutation({ mutationFn: (id: string) => removerActivity(id), onSuccess: invalidate });
}
