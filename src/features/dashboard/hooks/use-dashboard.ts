import { useQuery } from '@tanstack/react-query';
import {
  buscarAtividadesAtrasadas, buscarAtividadesDoDia, buscarAtividadesHoje,
  buscarClientesPrioritarios, buscarClientesRecentes, buscarFollowupsPendentes,
  buscarFunil, buscarIndicadores, buscarMetricas, pesquisarGlobal,
} from '../services/dashboard.service';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metricas: () => [...dashboardKeys.all, 'metricas'] as const,
  funil: () => [...dashboardKeys.all, 'funil'] as const,
  followups: () => [...dashboardKeys.all, 'followups'] as const,
  recentes: () => [...dashboardKeys.all, 'recentes'] as const,
  prioritarios: () => [...dashboardKeys.all, 'prioritarios'] as const,
  atividadesHoje: () => [...dashboardKeys.all, 'atividades-hoje'] as const,
  atividadesDia: () => [...dashboardKeys.all, 'atividades-dia'] as const,
  atividadesAtrasadas: () => [...dashboardKeys.all, 'atividades-atrasadas'] as const,
  indicadores: () => [...dashboardKeys.all, 'indicadores'] as const,
  pesquisa: (termo: string) => [...dashboardKeys.all, 'pesquisa', termo] as const,
};

export function useMetricas() { return useQuery({ queryKey: dashboardKeys.metricas(), queryFn: buscarMetricas, staleTime: 60_000 }); }
export function useFunilDashboard() { return useQuery({ queryKey: dashboardKeys.funil(), queryFn: buscarFunil, staleTime: 60_000 }); }
export function useFollowupsPendentes() { return useQuery({ queryKey: dashboardKeys.followups(), queryFn: buscarFollowupsPendentes, staleTime: 30_000 }); }
export function useClientesRecentes() { return useQuery({ queryKey: dashboardKeys.recentes(), queryFn: buscarClientesRecentes, staleTime: 60_000 }); }
export function useClientesPrioritarios() { return useQuery({ queryKey: dashboardKeys.prioritarios(), queryFn: buscarClientesPrioritarios, staleTime: 60_000 }); }
export function useAtividadesHoje() { return useQuery({ queryKey: dashboardKeys.atividadesHoje(), queryFn: buscarAtividadesHoje, staleTime: 30_000 }); }
export function useAtividadesDoDia() { return useQuery({ queryKey: dashboardKeys.atividadesDia(), queryFn: buscarAtividadesDoDia, staleTime: 30_000 }); }
export function useAtividadesAtrasadas() { return useQuery({ queryKey: dashboardKeys.atividadesAtrasadas(), queryFn: buscarAtividadesAtrasadas, staleTime: 30_000 }); }
export function useIndicadores() { return useQuery({ queryKey: dashboardKeys.indicadores(), queryFn: buscarIndicadores, staleTime: 120_000 }); }
export function usePesquisaGlobal(termo: string) {
  return useQuery({ queryKey: dashboardKeys.pesquisa(termo), queryFn: () => pesquisarGlobal(termo), enabled: termo.trim().length >= 2, staleTime: 10_000 });
}
