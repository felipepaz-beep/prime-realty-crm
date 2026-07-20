import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buscarConversaPorId, encerrarConversa, enviarMensagem, iniciarConversa, listarConversas, listarMensagens, marcarComoLida, removerMensagem } from '../services/communication.service';
import type { ConversationFiltros, ConversationInsert, MessageInsert } from '../types';

export const commKeys = {
  all: ['comunicacao'] as const,
  conversas: () => [...commKeys.all, 'conversas'] as const,
  conversasList: (filtros: ConversationFiltros) => [...commKeys.conversas(), filtros] as const,
  conversa: (id: string) => [...commKeys.all, 'conversa', id] as const,
  mensagens: (conversationId: string) => [...commKeys.all, 'mensagens', conversationId] as const,
};

export function useConversas(filtros: ConversationFiltros = {}) {
  return useQuery({
    queryKey: commKeys.conversasList(filtros),
    queryFn: () => listarConversas(filtros),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useConversa(id: string) {
  return useQuery({
    queryKey: commKeys.conversa(id),
    queryFn: () => buscarConversaPorId(id),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useIniciarConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConversationInsert) => iniciarConversa(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.conversas() }),
  });
}

export function useEncerrarConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => encerrarConversa(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: commKeys.conversas() });
      qc.invalidateQueries({ queryKey: commKeys.conversa(id) });
    },
  });
}

export function useMarcarComoLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarComoLida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.conversas() }),
  });
}

export function useMensagens(conversationId: string) {
  return useInfiniteQuery({
    queryKey: commKeys.mensagens(conversationId),
    queryFn: ({ pageParam }) => listarMensagens(conversationId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (firstPage) => firstPage.hasMore ? firstPage.messages[0]?.sent_at : undefined,
    staleTime: 10_000,
    enabled: !!conversationId,
  });
}

export function useEnviarMensagem(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessageInsert & { client_id: string }) => enviarMensagem(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.mensagens(conversationId) }),
  });
}

export function useRemoverMensagem(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerMensagem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.mensagens(conversationId) }),
  });
}

export function useRealtimeMensagens(conversationId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`msgs-rt-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        qc.invalidateQueries({ queryKey: commKeys.mensagens(conversationId) });
        qc.invalidateQueries({ queryKey: commKeys.conversas() });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);
}

export function useRealtimeConversas() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('conversas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        qc.invalidateQueries({ queryKey: commKeys.conversas() });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}
