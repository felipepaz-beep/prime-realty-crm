import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AIService, PromptLibrary, UsageService } from '../services/ai.service';
import type { AIAction, AICategory } from '../types';

export const aiKeys = {
  all: ['ia'] as const,
  prompts: (category?: AICategory) => [...aiKeys.all, 'prompts', category ?? 'all'] as const,
  logs: () => [...aiKeys.all, 'logs'] as const,
  summary: (days: number) => [...aiKeys.all, 'summary', days] as const,
};

export function useAIExecute() {
  return useMutation({
    mutationFn: (params: { action: AIAction; category: AICategory; userPrompt: string; clientId?: string; entityType?: string; entityId?: string; customContext?: string; temperature?: number; maxTokens?: number; }) => AIService.execute(params),
  });
}

export function usePrompts(category?: AICategory) {
  return useQuery({ queryKey: aiKeys.prompts(category), queryFn: () => PromptLibrary.listar(category), staleTime: 60_000 });
}

export function useCriarPrompt() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (p: Partial<Record<string, unknown>>) => PromptLibrary.criar(p), onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.all }) });
}

export function useAtualizarPrompt() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<Record<string, unknown>> }) => PromptLibrary.atualizar(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.all }) });
}

export function useToggleFavoritoPrompt() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => PromptLibrary.toggleFavorito(id, favorite), onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.all }) });
}

export function useRemoverPrompt() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => PromptLibrary.remover(id), onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.all }) });
}

export function useAISummary(days = 30) {
  return useQuery({ queryKey: aiKeys.summary(days), queryFn: () => UsageService.getSummary(days), staleTime: 120_000 });
}

export function useAIRecentLogs() {
  return useQuery({ queryKey: aiKeys.logs(), queryFn: () => UsageService.getRecentLogs(20), staleTime: 30_000 });
}
