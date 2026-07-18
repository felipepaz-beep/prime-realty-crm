CREATE TABLE public.user_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT        NOT NULL,
  key        TEXT        NOT NULL,
  value      JSONB       NOT NULL DEFAULT 'null'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, category, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_own" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "settings_insert_own" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "settings_update_own" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "settings_delete_own" ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER user_settings_set_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX settings_owner_category_idx ON public.user_settings(owner_id, category);
CREATE INDEX settings_owner_key_idx      ON public.user_settings(owner_id, category, key);

CREATE TABLE public.integrations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error','pending')),
  configuration JSONB       NOT NULL DEFAULT '{}'::jsonb,
  last_sync     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select_own" ON public.integrations FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "integrations_insert_own" ON public.integrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "integrations_update_own" ON public.integrations FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER integrations_set_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX integrations_owner_idx    ON public.integrations(owner_id);
CREATE INDEX integrations_provider_idx ON public.integrations(owner_id, provider);
CREATE INDEX integrations_status_idx   ON public.integrations(status);
