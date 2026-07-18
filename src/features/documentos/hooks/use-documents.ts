import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarDocumento, downloadDocumento, listarDocumentos, removerDocumento, restaurarDocumento, toggleFavorito } from '../services/document.service';
import type { ClientDocument, DocumentFiltros, DocumentUpdate } from '../types';

export const documentosKeys = {
  all: ['documentos'] as const,
  lists: () => [...documentosKeys.all, 'list'] as const,
  list: (clientId: string, filtros: DocumentFiltros) => [...documentosKeys.lists(), clientId, filtros] as const,
};

export function useDocumentos(clientId: string, filtros: DocumentFiltros = {}) {
  return useQuery({
    queryKey: documentosKeys.list(clientId, filtros),
    queryFn: () => listarDocumentos(clientId, filtros),
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

function useInvalidate(clientId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [...documentosKeys.lists(), clientId] });
}

export function useAtualizarDocumento(clientId: string) {
  const invalidate = useInvalidate(clientId);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocumentUpdate }) => atualizarDocumento(id, payload),
    onSuccess: invalidate,
  });
}

export function useToggleFavorito(clientId: string) {
  const invalidate = useInvalidate(clientId);
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => toggleFavorito(id, favorite),
    onSuccess: invalidate,
  });
}

export function useRemoverDocumento(clientId: string) {
  const invalidate = useInvalidate(clientId);
  return useMutation({ mutationFn: (id: string) => removerDocumento(id), onSuccess: invalidate });
}

export function useRestaurarDocumento(clientId: string) {
  const invalidate = useInvalidate(clientId);
  return useMutation({ mutationFn: (id: string) => restaurarDocumento(id), onSuccess: invalidate });
}

export function useDownloadDocumento() {
  return useMutation({ mutationFn: (doc: ClientDocument) => downloadDocumento(doc) });
}
