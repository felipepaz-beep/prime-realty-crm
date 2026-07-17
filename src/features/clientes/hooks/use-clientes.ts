import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  atualizarCliente,
  buscarClientePorId,
  criarCliente,
  listarClientes,
  removerCliente,
  restaurarCliente,
} from "../services/clients.service";
import type { ClienteFiltros, ClienteInsert, ClienteUpdate } from "../types";

export const clientesKeys = {
  all: ["clientes"] as const,
  lists: () => [...clientesKeys.all, "list"] as const,
  list: (filtros: ClienteFiltros) => [...clientesKeys.lists(), filtros] as const,
  details: () => [...clientesKeys.all, "detail"] as const,
  detail: (id: string) => [...clientesKeys.details(), id] as const,
};

export const clientesListOptions = (filtros: ClienteFiltros = {}) =>
  queryOptions({
    queryKey: clientesKeys.list(filtros),
    queryFn: () => listarClientes(filtros),
  });

export const clienteDetailOptions = (id: string) =>
  queryOptions({
    queryKey: clientesKeys.detail(id),
    queryFn: () => buscarClientePorId(id),
  });

export function useClientesList(filtros: ClienteFiltros = {}) {
  return useSuspenseQuery(clientesListOptions(filtros));
}

export function useClienteDetail(id: string) {
  return useSuspenseQuery(clienteDetailOptions(id));
}

export function useCriarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ClienteInsert, "owner_id">) => criarCliente(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
  });
}

export function useAtualizarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ClienteUpdate }) =>
      atualizarCliente(id, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
      qc.invalidateQueries({ queryKey: clientesKeys.detail(vars.id) });
    },
  });
}

export function useRemoverCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerCliente(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
      qc.invalidateQueries({ queryKey: clientesKeys.detail(id) });
    },
  });
}

export function useRestaurarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restaurarCliente(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
      qc.invalidateQueries({ queryKey: clientesKeys.detail(id) });
    },
  });
}
