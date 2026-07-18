import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IntegrationService, SettingsService } from '../services/settings.service';
import type { IntegrationProvider, IntegrationStatus, SettingsCategory } from '../types';

export const settingsKeys = {
  all: ['configuracoes'] as const,
  category: (cat: SettingsCategory) => [...settingsKeys.all, cat] as const,
  integrations: () => [...settingsKeys.all, 'integrations'] as const,
  integration: (p: IntegrationProvider) => [...settingsKeys.integrations(), p] as const,
};

export function useSettings(category: SettingsCategory) {
  return useQuery({ queryKey: settingsKeys.category(category), queryFn: () => SettingsService.getCategory(category), staleTime: 300_000 });
}

export function useSalvarSettings(category: SettingsCategory) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => SettingsService.setMany(category, values),
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: settingsKeys.category(category) });
      const prev = qc.getQueryData(settingsKeys.category(category));
      qc.setQueryData(settingsKeys.category(category), (old: Record<string, unknown>) => ({ ...old, ...values }));
      return { prev };
    },
    onError: (_, __, ctx) => { qc.setQueryData(settingsKeys.category(category), ctx?.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: settingsKeys.category(category) }); },
  });
}

export function useIntegrations() {
  return useQuery({ queryKey: settingsKeys.integrations(), queryFn: IntegrationService.listar.bind(IntegrationService), staleTime: 60_000 });
}

export function useSalvarIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, status, config }: { provider: IntegrationProvider; status: IntegrationStatus; config?: Record<string, unknown> }) =>
      IntegrationService.salvar(provider, status, config),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.integrations() }),
  });
}

export function useDesconectarIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: IntegrationProvider) => IntegrationService.desconectar(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.integrations() }),
  });
}
