// ─── Tipos de evento suportados ──────────────────────────────────────────────

export type TimelineEventType =
  // Ciclo de vida
  | 'cliente_criado'
  | 'cliente_atualizado'
  // Pipeline
  | 'etapa_alterada'
  // Comunicação
  | 'followup_realizado'
  | 'ligacao_realizada'
  | 'whatsapp_enviado'
  | 'whatsapp_recebido'
  | 'email_enviado'
  | 'email_recebido'
  // Visitas
  | 'visita_agendada'
  | 'visita_realizada'
  // Documentos e notas
  | 'documento_anexado'
  | 'nota_adicionada'
  // Tarefas
  | 'tarefa_criada'
  | 'tarefa_concluida'
  // Negócio
  | 'proposta_enviada'
  | 'proposta_aceita'
  | 'financiamento_iniciado'
  | 'venda_concluida';

// ─── Metadados tipados por evento ────────────────────────────────────────────
// Cada tipo de evento pode carregar metadados específicos.
// Manter extensível sem quebrar compatibilidade retroativa.

export type TimelineMetadata =
  | { etapa_anterior: string; etapa_nova: string }             // etapa_alterada
  | { campos_alterados: string[] }                             // cliente_atualizado
  | { url: string; nome: string; tamanho?: number }            // documento_anexado
  | { tarefa_id: string; titulo: string }                      // tarefa_criada/concluida
  | { proposta_id: string; valor?: number }                    // proposta_enviada/aceita
  | { valor?: number }                                         // venda_concluida
  | Record<string, unknown>;                                   // fallback extensível

// ─── Entidade principal ───────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  client_id: string;
  owner_id: string;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  metadata: TimelineMetadata;
  created_by: string | null;
  created_at: string;
  // Join opcional com profiles (autor)
  author?: {
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ─── Payload de inserção ──────────────────────────────────────────────────────

export interface TimelineInsertPayload {
  client_id: string;
  owner_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: TimelineMetadata;
  created_by?: string;
}

// ─── Resposta paginada ────────────────────────────────────────────────────────

export interface TimelinePaginada {
  events: TimelineEvent[];
  total: number;
  hasMore: boolean;
}
