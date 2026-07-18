export type TimelineCategory =
  | 'ciclo_vida' | 'pipeline' | 'comunicacao' | 'visita'
  | 'documento' | 'tarefa' | 'negocio' | 'sistema';

export type TimelineEventType =
  | 'cliente_criado' | 'cliente_atualizado' | 'cliente_deletado'
  | 'etapa_alterada'
  | 'followup_criado' | 'followup_realizado'
  | 'tarefa_criada' | 'tarefa_concluida'
  | 'ligacao_realizada' | 'ligacao_recebida'
  | 'whatsapp_enviado' | 'whatsapp_recebido'
  | 'email_enviado' | 'email_recebido'
  | 'visita_agendada' | 'visita_realizada'
  | 'documento_anexado' | 'documento_removido'
  | 'nota_adicionada' | 'nota_atualizada'
  | 'proposta_enviada' | 'proposta_aceita'
  | 'financiamento_iniciado' | 'financiamento_aprovado'
  | 'venda_concluida' | 'evento_customizado';

export type TimelineMetadata =
  | { etapa_anterior: string; etapa_nova: string }
  | { campos_alterados: string[] }
  | { url: string; nome: string; tamanho?: number }
  | { tarefa_id: string; titulo: string }
  | { proposta_id: string; valor?: number }
  | { property_code?: string; next_date?: string }
  | { valor?: number; payment?: string }
  | Record<string, unknown>;

export interface TimelineEvent {
  id: string;
  client_id: string;
  owner_id: string;
  category: TimelineCategory;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  metadata: TimelineMetadata;
  created_by: string | null;
  created_at: string;
  author?: {
    full_name: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TimelineInsertPayload {
  client_id: string;
  owner_id: string;
  category: TimelineCategory;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: TimelineMetadata;
  created_by?: string;
}

export interface TimelineFiltros {
  categoria?: TimelineCategory;
  event_type?: TimelineEventType;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface TimelinePaginada {
  events: TimelineEvent[];
  total: number;
  hasMore: boolean;
}

export interface TimelineGrupo {
  label: string;
  events: TimelineEvent[];
}
