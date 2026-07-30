ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS followup_intervalo_dias INTEGER NOT NULL DEFAULT 4;