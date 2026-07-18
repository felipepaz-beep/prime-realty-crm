import { useQuery } from '@tanstack/react-query';
import { AnalyticsService } from '../services/analytics.service';

export const analyticsKeys = {
  all: ['relatorios'] as const,
  kpis: () => [...analyticsKeys.all, 'kpis'] as const,
  funil: () => [...analyticsKeys.all, 'funil'] as const,
  origem: () => [...analyticsKeys.all, 'origem'] as const,
  atividades: () => [...analyticsKeys.all, 'atividades'] as const,
  documentos: () => [...analyticsKeys.all, 'documentos'] as const,
  conversas: () => [...analyticsKeys.all, 'conversas'] as const,
  timeline: (meses: number) => [...analyticsKeys.all, 'timeline', meses] as const,
};

export function useAnalyticsKPIs() {
  return useQuery({ queryKey: analyticsKeys.kpis(), queryFn: AnalyticsService.getKPIs.bind(AnalyticsService), staleTime: 120_000 });
}
export function useFunilConversao() {
  return useQuery({ queryKey: analyticsKeys.funil(), queryFn: AnalyticsService.getFunilConversao.bind(AnalyticsService), staleTime: 120_000 });
}
export function useOrigemLeads() {
  return useQuery({ queryKey: analyticsKeys.origem(), queryFn: AnalyticsService.getOrigemLeads.bind(AnalyticsService), staleTime: 120_000 });
}
export function useAtividadesAnalytics() {
  return useQuery({ queryKey: analyticsKeys.atividades(), queryFn: AnalyticsService.getAtividades.bind(AnalyticsService), staleTime: 120_000 });
}
export function useDocumentosAnalytics() {
  return useQuery({ queryKey: analyticsKeys.documentos(), queryFn: AnalyticsService.getDocumentos.bind(AnalyticsService), staleTime: 120_000 });
}
export function useConversasAnalytics() {
  return useQuery({ queryKey: analyticsKeys.conversas(), queryFn: AnalyticsService.getConversas.bind(AnalyticsService), staleTime: 120_000 });
}
export function useTimelineEventos(meses = 6) {
  return useQuery({ queryKey: analyticsKeys.timeline(meses), queryFn: () => AnalyticsService.getTimelineEventos(meses), staleTime: 120_000 });
}
