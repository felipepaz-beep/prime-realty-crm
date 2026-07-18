import { useQuery } from '@tanstack/react-query';
import { buscarClientesRecentes, buscarFollowupsPendentes, buscarFunil, buscarMetricas } from '../services/dashboard.service';

const dashboardKeys = {
  all: ['dashboard'] as const,
  metricas: () => [...dashboardKeys.all, 'metricas'] as const,
  funil: () => [...dashboardKeys.all, 'funil'] as const,
  followups: () => [...dashboardKeys.all, 'followups'] as const,
  recentes: () => [...dashboardKeys.all, 'recentes'] as const,
};

export function useMetricas() {
  return useQuery({ queryKey: dashboardKeys.metricas(), queryFn: buscarMetricas, staleTime: 60_000 });
}

export function useFunilDashboard() {
  return useQuery({ queryKey: dashboardKeys.funil(), queryFn: buscarFunil, staleTime: 60_000 });
}

export function useFollowupsPendentes() {
  return useQuery({ queryKey: dashboardKeys.followups(), queryFn: buscarFollowupsPendentes, staleTime: 30_000 });
}

export function useClientesRecentes() {
  return useQuery({ queryKey: dashboardKeys.recentes(), queryFn: buscarClientesRecentes, staleTime: 60_000 });
}
