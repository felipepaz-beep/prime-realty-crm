CREATE TABLE public.ai_usage_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL,
  category       TEXT        NOT NULL,
  provider       TEXT        NOT NULL,
  model          TEXT        NOT NULL,
  prompt_tokens  INT,
  output_tokens  INT,
  total_tokens   INT,
  cost_usd       NUMERIC(10,6),
  duration_ms    INT,
  status         TEXT        NOT NULL DEFAULT 'success' CHECK (status IN ('success','error','fallback','cancelled')),
  error_message  TEXT,
  fallback_from  TEXT,
  client_id      UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  entity_type    TEXT,
  entity_id      UUID,
  metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_select_own" ON public.ai_usage_logs FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "ai_logs_insert_own" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE INDEX ai_logs_owner_idx    ON public.ai_usage_logs(owner_id, created_at DESC);
CREATE INDEX ai_logs_provider_idx ON public.ai_usage_logs(provider);
CREATE INDEX ai_logs_category_idx ON public.ai_usage_logs(category);
CREATE INDEX ai_logs_status_idx   ON public.ai_usage_logs(status);
CREATE INDEX ai_logs_client_idx   ON public.ai_usage_logs(client_id) WHERE client_id IS NOT NULL;

CREATE TABLE public.ai_prompts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'geral' CHECK (category IN (
                'whatsapp','email','cliente','followup','marketing',
                'funil','documento','resumo','analise','financeiro','relatorio','geral'
              )),
  content     TEXT        NOT NULL,
  variables   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  provider    TEXT        DEFAULT NULL,
  favorite    BOOLEAN     NOT NULL DEFAULT false,
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  version     INT         NOT NULL DEFAULT 1,
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompts TO authenticated;
GRANT ALL ON public.ai_prompts TO service_role;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_prompts_select_own" ON public.ai_prompts FOR SELECT TO authenticated USING (auth.uid() = owner_id OR is_system = true);
CREATE POLICY "ai_prompts_insert_own" ON public.ai_prompts FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ai_prompts_update_own" ON public.ai_prompts FOR UPDATE TO authenticated USING (auth.uid() = owner_id AND is_system = false);
CREATE POLICY "ai_prompts_delete_own" ON public.ai_prompts FOR DELETE TO authenticated USING (auth.uid() = owner_id AND is_system = false);

CREATE TRIGGER ai_prompts_set_updated_at BEFORE UPDATE ON public.ai_prompts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX ai_prompts_owner_idx    ON public.ai_prompts(owner_id)            WHERE deleted_at IS NULL;
CREATE INDEX ai_prompts_category_idx ON public.ai_prompts(category)            WHERE deleted_at IS NULL;
CREATE INDEX ai_prompts_favorite_idx ON public.ai_prompts(owner_id, favorite)  WHERE deleted_at IS NULL;
