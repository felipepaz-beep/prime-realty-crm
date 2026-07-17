-- =========================================================
-- Tabela: client_timeline
-- Histórico cronológico de eventos por cliente.
-- Imutável por design: sem UPDATE, sem DELETE para authenticated.
-- =========================================================

CREATE TABLE public.client_timeline (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT timeline_event_type_chk CHECK (event_type IN (
    -- Ciclo de vida do cliente
    'cliente_criado',
    'cliente_atualizado',
    -- Pipeline
    'etapa_alterada',
    -- Comunicação
    'followup_realizado',
    'ligacao_realizada',
    'whatsapp_enviado',
    'whatsapp_recebido',
    'email_enviado',
    'email_recebido',
    -- Visitas
    'visita_agendada',
    'visita_realizada',
    -- Documentos e notas
    'documento_anexado',
    'nota_adicionada',
    -- Tarefas
    'tarefa_criada',
    'tarefa_concluida',
    -- Negócio
    'proposta_enviada',
    'proposta_aceita',
    'financiamento_iniciado',
    'venda_concluida'
  ))
);

-- =========================================================
-- Grants
-- authenticated pode SELECT e INSERT; nunca UPDATE/DELETE
-- (imutabilidade garante integridade do histórico)
-- =========================================================
GRANT SELECT, INSERT ON public.client_timeline TO authenticated;
GRANT ALL ON public.client_timeline TO service_role;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.client_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own timeline events"
  ON public.client_timeline FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own timeline events"
  ON public.client_timeline FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- Índices para performance em larga escala
--
-- Estratégia:
-- 1. (client_id, created_at DESC) — query principal: eventos de um cliente ordenados
-- 2. owner_id                     — filtros de segurança e dashboards futuros
-- 3. event_type                   — filtros por tipo de evento
-- 4. created_at DESC              — timeline global do corretor (futuro)
-- 5. metadata GIN                 — buscas dentro do JSON (ex: buscar por id de tarefa)
-- =========================================================
CREATE INDEX timeline_client_created_idx  ON public.client_timeline(client_id, created_at DESC);
CREATE INDEX timeline_owner_id_idx        ON public.client_timeline(owner_id);
CREATE INDEX timeline_event_type_idx      ON public.client_timeline(event_type);
CREATE INDEX timeline_created_at_idx      ON public.client_timeline(created_at DESC);
CREATE INDEX timeline_metadata_gin_idx    ON public.client_timeline USING GIN (metadata);
