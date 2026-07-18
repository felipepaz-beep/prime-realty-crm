ALTER TABLE public.client_timeline
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sistema'
    CHECK (category IN (
      'ciclo_vida','pipeline','comunicacao','visita',
      'documento','tarefa','negocio','sistema'
    ));

CREATE INDEX IF NOT EXISTS timeline_category_idx
  ON public.client_timeline(category);

CREATE INDEX IF NOT EXISTS timeline_category_created_idx
  ON public.client_timeline(client_id, category, created_at DESC);

ALTER TABLE public.client_timeline
  DROP CONSTRAINT IF EXISTS timeline_event_type_chk;

ALTER TABLE public.client_timeline
  ADD CONSTRAINT timeline_event_type_chk CHECK (event_type IN (
    'cliente_criado','cliente_atualizado','cliente_deletado',
    'etapa_alterada',
    'followup_criado','followup_realizado',
    'tarefa_criada','tarefa_concluida',
    'ligacao_realizada','ligacao_recebida',
    'whatsapp_enviado','whatsapp_recebido',
    'email_enviado','email_recebido',
    'visita_agendada','visita_realizada',
    'documento_anexado','documento_removido',
    'nota_adicionada','nota_atualizada',
    'proposta_enviada','proposta_aceita',
    'financiamento_iniciado','financiamento_aprovado',
    'venda_concluida','evento_customizado'
  ));

UPDATE public.client_timeline SET category = 'ciclo_vida'
  WHERE event_type IN ('cliente_criado','cliente_atualizado','cliente_deletado');
UPDATE public.client_timeline SET category = 'pipeline'
  WHERE event_type = 'etapa_alterada';
UPDATE public.client_timeline SET category = 'comunicacao'
  WHERE event_type IN ('followup_criado','followup_realizado','ligacao_realizada',
    'ligacao_recebida','whatsapp_enviado','whatsapp_recebido','email_enviado','email_recebido');
UPDATE public.client_timeline SET category = 'visita'
  WHERE event_type IN ('visita_agendada','visita_realizada');
UPDATE public.client_timeline SET category = 'documento'
  WHERE event_type IN ('documento_anexado','documento_removido','nota_adicionada','nota_atualizada');
UPDATE public.client_timeline SET category = 'tarefa'
  WHERE event_type IN ('tarefa_criada','tarefa_concluida');
UPDATE public.client_timeline SET category = 'negocio'
  WHERE event_type IN ('proposta_enviada','proposta_aceita',
    'financiamento_iniciado','financiamento_aprovado','venda_concluida');