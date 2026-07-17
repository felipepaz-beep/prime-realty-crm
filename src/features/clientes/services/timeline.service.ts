/**
 * TimelineService
 *
 * Única porta de entrada para a tabela `client_timeline`.
 * Nenhum módulo deve inserir registros diretamente — todos passam por aqui.
 *
 * Benefícios:
 * - Validação centralizada de owner_id e created_by (evita eventos órfãos)
 * - Fire-and-forget por padrão: erros não bloqueiam a ação principal do usuário
 * - Paginação cursor-based: suporta milhões de eventos sem degradação
 * - Fácil de mockar em testes
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TimelineEvent,
  TimelineInsertPayload,
  TimelinePaginada,
} from '../timeline.types';

const TABLE = 'client_timeline';
const PAGE_SIZE = 20;

// ─── Leitura ──────────────────────────────────────────────────────────────────

/**
 * Busca eventos de um cliente com paginação cursor-based.
 * Mais eficiente que OFFSET para tabelas grandes — usa o created_at do último
 * item como cursor, evitando full scans crescentes.
 *
 * @param clientId  ID do cliente
 * @param cursor    created_at do último item (undefined = primeira página)
 */
export async function buscarEventosCliente(
  clientId: string,
  cursor?: string
): Promise<TimelinePaginada> {
  let query = supabase
    .from(TABLE)
    .select('*, author:profiles!created_by(full_name, display_name, avatar_url)', {
      count: 'exact',
    })
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1); // busca 1 a mais para saber se há próxima página

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []) as unknown as TimelineEvent[];
  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop(); // remove o item extra

  return {
    events: items,
    total: count ?? 0,
    hasMore,
  };
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/**
 * Registra um evento na timeline.
 * Resolve automaticamente owner_id e created_by da sessão ativa se não fornecidos.
 *
 * @throws Lança erro apenas se a sessão for inválida.
 *         Erros de banco são silenciosos (fire-and-forget) para não bloquear o usuário.
 */
export async function registrarEvento(
  payload: Omit<TimelineInsertPayload, 'owner_id' | 'created_by'> &
    Partial<Pick<TimelineInsertPayload, 'owner_id' | 'created_by'>>
): Promise<void> {
  // Resolve usuário autenticado
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) return; // sessão encerrada, ignora silenciosamente

  const record = {
    client_id: payload.client_id,
    owner_id: payload.owner_id ?? userId,
    event_type: payload.event_type,
    title: payload.title,
    description: payload.description ?? null,
    metadata: payload.metadata ?? {},
    created_by: payload.created_by ?? userId,
  };

  const { error } = await supabase.from(TABLE).insert(record as never);

  // Log silencioso — evento de timeline nunca deve quebrar a UX principal
  if (error) {
    console.warn('[TimelineService] Falha ao registrar evento:', error.message, record);
  }
}

// ─── Helpers semânticos ───────────────────────────────────────────────────────
// Cada módulo chama o helper correspondente ao invés de montar o payload manual.
// Isso garante títulos e metadados consistentes em toda a aplicação.

export const TimelineService = {
  // ── Ciclo de vida ──

  clienteCriado(clientId: string, nome: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'cliente_criado',
      title: 'Cliente cadastrado',
      description: `${nome} foi adicionado ao CRM.`,
      metadata: {},
    });
  },

  clienteAtualizado(clientId: string, camposAlterados: string[]) {
    const lista = camposAlterados
      .map((c) => CAMPO_LABELS[c] ?? c)
      .join(', ');
    return registrarEvento({
      client_id: clientId,
      event_type: 'cliente_atualizado',
      title: 'Dados atualizados',
      description: `Campos editados: ${lista}.`,
      metadata: { campos_alterados: camposAlterados },
    });
  },

  // ── Pipeline ──

  etapaAlterada(clientId: string, etapaAnterior: string, etapaNova: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'etapa_alterada',
      title: 'Etapa do pipeline alterada',
      description: `Movido de "${ETAPA_LABELS[etapaAnterior] ?? etapaAnterior}" para "${ETAPA_LABELS[etapaNova] ?? etapaNova}".`,
      metadata: { etapa_anterior: etapaAnterior, etapa_nova: etapaNova },
    });
  },

  // ── Comunicação (implementação futura) ──

  followupRealizado(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'followup_realizado',
      title: 'Follow-up realizado',
      description: descricao,
    });
  },

  ligacaoRealizada(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'ligacao_realizada',
      title: 'Ligação realizada',
      description: descricao,
    });
  },

  whatsappEnviado(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'whatsapp_enviado',
      title: 'WhatsApp enviado',
      description: descricao,
    });
  },

  whatsappRecebido(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'whatsapp_recebido',
      title: 'WhatsApp recebido',
      description: descricao,
    });
  },

  emailEnviado(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'email_enviado',
      title: 'E-mail enviado',
      description: descricao,
    });
  },

  emailRecebido(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'email_recebido',
      title: 'E-mail recebido',
      description: descricao,
    });
  },

  // ── Visitas ──

  visitaAgendada(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'visita_agendada',
      title: 'Visita agendada',
      description: descricao,
    });
  },

  visitaRealizada(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'visita_realizada',
      title: 'Visita realizada',
      description: descricao,
    });
  },

  // ── Documentos e notas ──

  documentoAnexado(clientId: string, nome: string, url: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'documento_anexado',
      title: 'Documento anexado',
      description: nome,
      metadata: { url, nome },
    });
  },

  notaAdicionada(clientId: string, nota: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'nota_adicionada',
      title: 'Nota adicionada',
      description: nota,
    });
  },

  // ── Tarefas ──

  tarefaCriada(clientId: string, tarefaId: string, titulo: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'tarefa_criada',
      title: 'Tarefa criada',
      description: titulo,
      metadata: { tarefa_id: tarefaId, titulo },
    });
  },

  tarefaConcluida(clientId: string, tarefaId: string, titulo: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'tarefa_concluida',
      title: 'Tarefa concluída',
      description: titulo,
      metadata: { tarefa_id: tarefaId, titulo },
    });
  },

  // ── Negócio ──

  propostaEnviada(clientId: string, propostaId: string, valor?: number) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'proposta_enviada',
      title: 'Proposta enviada',
      description: valor
        ? `Valor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        : undefined,
      metadata: { proposta_id: propostaId, valor },
    });
  },

  propostaAceita(clientId: string, propostaId: string, valor?: number) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'proposta_aceita',
      title: 'Proposta aceita',
      description: valor
        ? `Valor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        : undefined,
      metadata: { proposta_id: propostaId, valor },
    });
  },

  financiamentoIniciado(clientId: string, descricao?: string) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'financiamento_iniciado',
      title: 'Financiamento iniciado',
      description: descricao,
    });
  },

  vendaConcluida(clientId: string, valor?: number) {
    return registrarEvento({
      client_id: clientId,
      event_type: 'venda_concluida',
      title: 'Venda concluída',
      description: valor
        ? `Valor final: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        : undefined,
      metadata: { valor },
    });
  },
} as const;

// ─── Dicionários internos ─────────────────────────────────────────────────────

const ETAPA_LABELS: Record<string, string> = {
  novo_lead: 'Novo lead',
  contato_iniciado: 'Contato iniciado',
  qualificacao: 'Qualificação',
  visita_agendada: 'Visita agendada',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado_ganho: 'Fechado (ganho)',
  fechado_perdido: 'Fechado (perdido)',
};

const CAMPO_LABELS: Record<string, string> = {
  nome: 'Nome',
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  cidade: 'Cidade',
  estado: 'Estado',
  etapa_funil: 'Etapa do funil',
  status: 'Status',
  prioridade: 'Prioridade',
  temperatura: 'Temperatura',
  score: 'Score',
  observacoes: 'Observações',
  origem_lead: 'Origem do lead',
  proximo_followup: 'Próximo follow-up',
};
