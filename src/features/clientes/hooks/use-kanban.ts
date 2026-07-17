import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { TimelineService } from '../services/timeline.service';
import { ETAPA_FUNIL_ORDEM } from '../constants';
import type { Cliente, ClienteEtapaFunil } from '../types';
import { clientesKeys } from './use-clientes';

export type KanbanColuna = {
  etapa: ClienteEtapaFunil;
  clientes: Cliente[];
};

/** Organiza a lista flat de clientes em colunas ordenadas por ETAPA_FUNIL_ORDEM */
export function buildColunas(clientes: Cliente[]): KanbanColuna[] {
  const map = new Map<ClienteEtapaFunil, Cliente[]>();
  for (const etapa of ETAPA_FUNIL_ORDEM) map.set(etapa, []);
  for (const c of clientes) {
    map.get(c.etapa_funil)?.push(c);
  }
  return ETAPA_FUNIL_ORDEM.map((etapa) => ({ etapa, clientes: map.get(etapa) ?? [] }));
}

/**
 * Gerencia o estado local otimista do kanban e persiste mudanças no Supabase.
 * Recebe a lista de clientes vinda do React Query e devolve colunas + handler de drop.
 */
export function useKanban(clientesOriginais: Cliente[]) {
  // Estado local para atualização otimista sem flickering
  const [clientesLocais, setClientesLocais] = useState<Cliente[]>(clientesOriginais);
  const qc = useQueryClient();

  // Sincroniza quando os dados externos mudam (ex: refetch)
  const sincronizar = useCallback((novos: Cliente[]) => {
    setClientesLocais(novos);
  }, []);

  const colunas = buildColunas(clientesLocais);

  const moverCliente = useCallback(
    async (clienteId: string, novaEtapa: ClienteEtapaFunil) => {
      const clienteAtual = clientesLocais.find((c) => c.id === clienteId);
      if (!clienteAtual || clienteAtual.etapa_funil === novaEtapa) return;

      // Atualização otimista imediata
      setClientesLocais((prev) =>
        prev.map((c) => (c.id === clienteId ? { ...c, etapa_funil: novaEtapa } : c))
      );

      // Persiste no banco
      const { error } = await supabase
        .from('clients')
        .update({ etapa_funil: novaEtapa })
        .eq('id', clienteId);

      if (error) {
        // Rollback
        setClientesLocais((prev) =>
          prev.map((c) =>
            c.id === clienteId ? { ...c, etapa_funil: clienteAtual.etapa_funil } : c
          )
        );
        toast.error('Erro ao mover cliente. Tente novamente.');
        return;
      }

      // Evento automático de mudança de etapa (fire-and-forget)
      TimelineService.etapaAlterada(clienteId, clienteAtual.etapa_funil, novaEtapa);

      // Invalida cache do React Query para manter listagem consistente
      qc.invalidateQueries({ queryKey: clientesKeys.lists() });
    },
    [clientesLocais, qc]
  );

  return { colunas, moverCliente, sincronizar };
}
