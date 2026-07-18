import { useInfiniteQuery } from '@tanstack/react-query';
import { buscarEventosCliente } from '../services/timeline.service';
import type { TimelineFiltros } from '../timeline.types';

export const timelineKeys = {
  all: ['timeline'] as const,
  cliente: (clientId: string, filtros?: TimelineFiltros) =>
    [...timelineKeys.all, clientId, filtros ?? {}] as const,
};

export function useTimeline(clientId: string, filtros?: TimelineFiltros) {
  return useInfiniteQuery({
    queryKey: timelineKeys.cliente(clientId, filtros),
    queryFn: ({ pageParam }) =>
      buscarEventosCliente(clientId, pageParam as string | undefined, filtros),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.events.at(-1)?.created_at;
    },
    staleTime: 30_000,
  });
}
