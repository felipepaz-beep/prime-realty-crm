import { useInfiniteQuery } from '@tanstack/react-query';
import { buscarEventosCliente } from '../services/timeline.service';

export const timelineKeys = {
  all: ['timeline'] as const,
  cliente: (clientId: string) => [...timelineKeys.all, clientId] as const,
};

/**
 * Hook com carregamento incremental (infinite scroll).
 * Cada página usa o created_at do último item como cursor —
 * performático mesmo com milhões de registros.
 */
export function useTimeline(clientId: string) {
  return useInfiniteQuery({
    queryKey: timelineKeys.cliente(clientId),
    queryFn: ({ pageParam }) =>
      buscarEventosCliente(clientId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      const lastEvent = lastPage.events.at(-1);
      return lastEvent?.created_at;
    },
    staleTime: 30_000, // 30s — timeline não muda o tempo todo
  });
}
