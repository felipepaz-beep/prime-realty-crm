import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { atualizarCliente, buscarClientePorId, criarCliente, listarClientes, removerCliente, restaurarCliente } from '../services/clients.service';
import { TimelineService } from '../services/timeline.service';
import type { ClienteFiltros, ClienteInsert, ClienteUpdate } from '../types';

export const clientesKeys = {
  all: ['clientes'] as const,
  lists: () => [...clientesKeys.all, 'list'] as const,
  list: (filtros: ClienteFiltros) => [...clientesKeys.lists(), filtros] as const,
  details: () => [...clientesKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientesKeys.details(), id] as const,
};

export function useClientesSuspense(filtros: ClienteFiltros = {}) {
  return useSuspenseQuery({ queryKey: clientesKeys.list(filtros), queryFn: () => listarClientes(filtros) });
}

export function useClientes(filtros: ClienteFiltros = {}) {
  return useQuery({ queryKey: clientesKeys.list(filtros), queryFn: () => listarClientes(filtros) });
}

export function useClienteDetalhe(id: string) {
  return useQuery({ queryKey: clientesKeys.detail(id), queryFn: () => buscarClientePorId(id) });
}

export function useCriarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClienteInsert) => criarCliente(payload),
    onSuccess: (cliente) => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
      TimelineService.clienteCriado(cliente.id, cliente.nome);
    },
  });
}

export function useAtualizarCliente(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClienteUpdate) => atualizarCliente(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
      qc.setQueryData(clientesKeys.detail(id), data);
    },
  });
}

export function useRemoverCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerCliente(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: clientesKeys.lists() }); },
  });
}

export function useRestaurarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restaurarCliente(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: clientesKeys.lists() }); },
  });
}
