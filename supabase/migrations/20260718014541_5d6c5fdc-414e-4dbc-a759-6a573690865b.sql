CREATE TABLE public.activities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id        UUID        REFERENCES public.clients(id) ON DELETE SET NULL,
  type             TEXT        NOT NULL CHECK (type IN ('TASK','FOLLOWUP','VISIT','CALL','MEETING','EMAIL','PERSONAL')),
  title            TEXT        NOT NULL,
  description      TEXT,
  status           TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
  priority         TEXT        NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  scheduled_at     TIMESTAMPTZ,
  due_at           TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  reminder_at      TIMESTAMPTZ,
  duration_minutes INT         CHECK (duration_minutes > 0),
  location         TEXT,
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  recurrence       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select_own" ON public.activities
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "activities_insert_own" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "activities_update_own" ON public.activities
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "activities_delete_own" ON public.activities
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER activities_set_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX activities_owner_scheduled_idx ON public.activities(owner_id, scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX activities_client_id_idx       ON public.activities(client_id)              WHERE deleted_at IS NULL;
CREATE INDEX activities_status_idx          ON public.activities(status)                 WHERE deleted_at IS NULL;
CREATE INDEX activities_priority_idx        ON public.activities(priority)               WHERE deleted_at IS NULL;
CREATE INDEX activities_due_at_idx          ON public.activities(due_at)                 WHERE deleted_at IS NULL;
CREATE INDEX activities_type_idx            ON public.activities(type)                   WHERE deleted_at IS NULL;
CREATE INDEX activities_metadata_gin_idx    ON public.activities USING GIN (metadata);

CREATE OR REPLACE VIEW public.v_activities_hoje WITH (security_invoker = true) AS
SELECT * FROM public.activities
WHERE deleted_at IS NULL AND status NOT IN ('COMPLETED','CANCELLED')
  AND (scheduled_at::date = CURRENT_DATE OR due_at::date = CURRENT_DATE)
ORDER BY COALESCE(scheduled_at, due_at) ASC;
GRANT SELECT ON public.v_activities_hoje TO authenticated;

CREATE OR REPLACE VIEW public.v_activities_atrasadas WITH (security_invoker = true) AS
SELECT * FROM public.activities
WHERE deleted_at IS NULL AND status NOT IN ('COMPLETED','CANCELLED') AND due_at < now()
ORDER BY due_at ASC;
GRANT SELECT ON public.v_activities_atrasadas TO authenticated;