import { supabase } from '@/integrations/supabase/client';
import type {
  TimelineCategory, TimelineEvent, TimelineEventType,
  TimelineFiltros, TimelineInsertPayload, TimelinePaginada,
} from '../timeline.types';

const TABLE = 'client_timeline';
const PAGE_SIZE = 20;

export async function buscarEventosCliente(
  clientId: string,
  cursor?: string,
  filtros?: TimelineFiltros,
): Promise<TimelinePaginada> {
  let query = supabase
    .from(TABLE)
    .select('*, author:profiles!created_by(full_name, display_name, avatar_url)', { count: 'exact' })
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt('created_at', cursor);
  if (filtros?.categoria) query = query.eq('category', filtros.categoria);
  if (filtros?.event_type) query = query.eq('event_type', filtros.event_type);
  if (filtros?.dataInicio) query = query.gte('created_at', filtros.dataInicio);
  if (filtros?.dataFim) query = query.lte('created_at', filtros.dataFim);
  if (filtros?.busca) query = query.or(`title.ilike.%${filtros.busca}%,description.ilike.%${filtros.busca}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data ?? []) as unknown as TimelineEvent[];
  const hasMore = items.length > PAGE_SIZE;
  if (hasMore) items.pop();

  return { events: items, total: count ?? 0, hasMore };
}

export async function registrarEvento(
  payload: Omit<TimelineInsertPayload, 'owner_id' | 'created_by'> &
    Partial<Pick<TimelineInsertPayload, 'owner_id' | 'created_by'>>,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getUser();
  const userId = sessionData.user?.id;
  if (!userId) return;

  const record = {
    client_id: payload.client_id,
    owner_id: payload.owner_id ?? userId,
    category: payload.category,
    event_type: payload.event_type,
    title: payload.title,
    description: payload.description ?? null,
    metadata: payload.metadata ?? {},
    created_by: payload.created_by ?? userId,
  };

  const { error } = await supabase.from(TABLE).insert(record as never);
  if (error) console.warn('[TimelineService] Falha:', error.message, record);
}

export const TimelineService = {
  clienteCriado(clientId: string, nome: string) {
    return registrarEvento({ client_id: clientId, category: 'ciclo_vida', event_type: 'cliente_criado', title: 'Cliente cadastrado', description: `${nome} foi adicionado ao CRM.`, metadata: {} });
  },
  clienteAtualizado(clientId: string, camposAlterados: string[]) {
    const lista = camposAlterados.map((c) => CAMPO_LABELS[c] ?? c).join(', ');
    return registrarEvento({ client_id: clientId, category: 'ciclo_vida', event_type: 'cliente_atualizado', title: 'Dados atualizados', description: `Campos editados: ${lista}.`, metadata: { campos_alterados: camposAlterados } });
  },
  clienteDeletado(clientId: string, nome: string) {
    return registrarEvento({ client_id: clientId, category: 'ciclo_vida', event_type: 'cliente_deletado', title: 'Cliente removido', description: `${nome} foi removido do CRM.`, metadata: {} });
  },
  etapaAlterada(clientId: string, etapaAnterior: string, etapaNova: string) {
    return registrarEvento({ client_id: clientId, category: 'pipeline', event_type: 'etapa_alterada', title: 'Etapa do pipeline alterada', description: `Movido de "${ETAPA_LABELS[etapaAnterior] ?? etapaAnterior}" para "${ETAPA_LABELS[etapaNova] ?? etapaNova}".`, metadata: { etapa_anterior: etapaAnterior, etapa_nova: etapaNova } });
  },
  followupCriado(clientId: string, data: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'followup_criado', title: 'Follow-up agendado', description: `Próximo contato em ${new Date(data).toLocaleDateString('pt-BR')}.`, metadata: { next_date: data } });
  },
  followupRealizado(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'followup_realizado', title: 'Follow-up realizado', description: descricao });
  },
  tarefaCriada(clientId: string, tarefaId: string, titulo: string) {
    return registrarEvento({ client_id: clientId, category: 'tarefa', event_type: 'tarefa_criada', title: 'Tarefa criada', description: titulo, metadata: { tarefa_id: tarefaId, titulo } });
  },
  tarefaConcluida(clientId: string, tarefaId: string, titulo: string) {
    return registrarEvento({ client_id: clientId, category: 'tarefa', event_type: 'tarefa_concluida', title: 'Tarefa concluída', description: titulo, metadata: { tarefa_id: tarefaId, titulo } });
  },
  ligacaoRealizada(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'ligacao_realizada', title: 'Ligação realizada', description: descricao });
  },
  ligacaoRecebida(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'ligacao_recebida', title: 'Ligação recebida', description: descricao });
  },
  whatsappEnviado(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'whatsapp_enviado', title: 'WhatsApp enviado', description: descricao });
  },
  whatsappRecebido(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'whatsapp_recebido', title: 'WhatsApp recebido', description: descricao });
  },
  emailEnviado(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'email_enviado', title: 'E-mail enviado', description: descricao });
  },
  emailRecebido(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'email_recebido', title: 'E-mail recebido', description: descricao });
  },
  visitaAgendada(clientId: string, codigoImovel?: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'visita', event_type: 'visita_agendada', title: 'Visita agendada', description: descricao, metadata: codigoImovel ? { property_code: codigoImovel } : {} });
  },
  visitaRealizada(clientId: string, codigoImovel?: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'visita', event_type: 'visita_realizada', title: 'Visita realizada', description: descricao, metadata: codigoImovel ? { property_code: codigoImovel } : {} });
  },
  documentoAnexado(clientId: string, nome: string, url: string) {
    return registrarEvento({ client_id: clientId, category: 'documento', event_type: 'documento_anexado', title: 'Documento anexado', description: nome, metadata: { url, nome } });
  },
  documentoRemovido(clientId: string, nome: string) {
    return registrarEvento({ client_id: clientId, category: 'documento', event_type: 'documento_removido', title: 'Documento removido', description: nome, metadata: { nome, url: '' } });
  },
  notaAdicionada(clientId: string, nota: string) {
    return registrarEvento({ client_id: clientId, category: 'documento', event_type: 'nota_adicionada', title: 'Nota adicionada', description: nota });
  },
  notaAtualizada(clientId: string, nota: string) {
    return registrarEvento({ client_id: clientId, category: 'documento', event_type: 'nota_atualizada', title: 'Nota atualizada', description: nota });
  },
  propostaEnviada(clientId: string, propostaId: string, valor?: number) {
    return registrarEvento({ client_id: clientId, category: 'negocio', event_type: 'proposta_enviada', title: 'Proposta enviada', description: valor ? `Valor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : undefined, metadata: { proposta_id: propostaId, valor } });
  },
  propostaAceita(clientId: string, propostaId: string, valor?: number) {
    return registrarEvento({ client_id: clientId, category: 'negocio', event_type: 'proposta_aceita', title: 'Proposta aceita', description: valor ? `Valor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : undefined, metadata: { proposta_id: propostaId, valor } });
  },
  financiamentoIniciado(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'negocio', event_type: 'financiamento_iniciado', title: 'Financiamento iniciado', description: descricao });
  },
  financiamentoAprovado(clientId: string, descricao?: string) {
    return registrarEvento({ client_id: clientId, category: 'negocio', event_type: 'financiamento_aprovado', title: 'Financiamento aprovado', description: descricao });
  },
  vendaConcluida(clientId: string, valor?: number, formaPagamento?: string) {
    return registrarEvento({ client_id: clientId, category: 'negocio', event_type: 'venda_concluida', title: 'Venda concluída! 🏆', description: valor ? `Valor final: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : undefined, metadata: { valor, payment: formaPagamento } });
  },
  eventoCustomizado(clientId: string, titulo: string, descricao?: string, categoria: TimelineCategory = 'sistema') {
    return registrarEvento({ client_id: clientId, category: categoria, event_type: 'evento_customizado', title: titulo, description: descricao });
  },
  agenteIADetectado(clientId: string, descricao: string, metadata: Record<string, unknown>) {
    return registrarEvento({ client_id: clientId, category: 'comunicacao', event_type: 'evento_customizado', title: 'Mensagem pendente detectada pelo Agente IA', description: descricao, metadata });
  },
} as const;

const ETAPA_LABELS: Record<string, string> = {
  novo_lead: 'Novo lead', contato_iniciado: 'Contato iniciado', qualificacao: 'Qualificação',
  visita_agendada: 'Visita agendada', proposta: 'Proposta', negociacao: 'Negociação',
  fechado_ganho: 'Fechado (ganho)', fechado_perdido: 'Fechado (perdido)',
};

const CAMPO_LABELS: Record<string, string> = {
  nome: 'Nome', telefone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail',
  cidade: 'Cidade', estado: 'Estado', etapa_funil: 'Etapa do funil', status: 'Status',
  prioridade: 'Prioridade', temperatura: 'Temperatura', score: 'Score',
  observacoes: 'Observações', origem_lead: 'Origem do lead', proximo_followup: 'Próximo follow-up',
};
