import { useMutation, useQuery } from '@tanstack/react-query';
import { CopilotoService } from '../services/copiloto.service';
import type { MensagemConversa, MensagemCopiloto } from '../services/copiloto.service';

export { type MensagemConversa, type MensagemCopiloto };

export const copilotoKeys = {
  all: ['copiloto'] as const,
  mensagens: (clientId: string) => [...copilotoKeys.all, 'msgs', clientId] as const,
};

export function useMensagensCliente(clientId: string | null) {
  return useQuery({
    queryKey: copilotoKeys.mensagens(clientId ?? ''),
    queryFn: () => CopilotoService.buscarMensagensCliente(clientId!),
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

export function useAnalisarConversa() {
  return useMutation({
    mutationFn: ({
      clienteNome,
      mensagens,
    }: {
      clienteNome: string;
      mensagens: MensagemConversa[];
    }) => CopilotoService.analisarConversa(clienteNome, mensagens),
  });
}

export function useChatCopiloto() {
  return useMutation({
    mutationFn: (params: {
      clienteNome: string;
      mensagens: MensagemConversa[];
      historico: MensagemCopiloto[];
      pergunta: string;
    }) => CopilotoService.chatCopiloto(params),
  });
}
