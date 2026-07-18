
-- Enums
CREATE TYPE public.commission_status AS ENUM ('prevista', 'recebida', 'atrasada', 'cancelada');
CREATE TYPE public.payment_method AS ENUM ('pix', 'ted', 'transferencia', 'boleto', 'cheque', 'dinheiro', 'outro');

-- commissions
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  property_code TEXT,
  gross_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(6,3) NOT NULL DEFAULT 0,
  commission_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.commission_status NOT NULL DEFAULT 'prevista',
  expected_date DATE,
  received_date DATE,
  payment_method public.payment_method,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_select_own" ON public.commissions
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "commissions_insert_own" ON public.commissions
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "commissions_update_own" ON public.commissions
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "commissions_delete_own" ON public.commissions
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_commissions_owner ON public.commissions(owner_id);
CREATE INDEX idx_commissions_status ON public.commissions(owner_id, status);
CREATE INDEX idx_commissions_expected ON public.commissions(owner_id, expected_date);
CREATE INDEX idx_commissions_received ON public.commissions(owner_id, received_date);
CREATE INDEX idx_commissions_client ON public.commissions(client_id);

CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  goal_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  goal_sales INTEGER NOT NULL DEFAULT 0,
  goal_commission NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX idx_goals_owner_period ON public.goals(owner_id, year, month);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Views (security_invoker respeita RLS do usuário)
CREATE OR REPLACE VIEW public.v_financeiro_resumo
WITH (security_invoker = true) AS
SELECT
  owner_id,
  COALESCE(SUM(commission_value) FILTER (WHERE status = 'prevista'), 0) AS previsto_total,
  COALESCE(SUM(commission_value) FILTER (WHERE status = 'recebida'), 0) AS recebido_total,
  COALESCE(SUM(commission_value) FILTER (WHERE status = 'atrasada'), 0) AS atrasado_total,
  COALESCE(SUM(commission_value) FILTER (
    WHERE status = 'recebida'
      AND received_date >= date_trunc('month', now())::date
      AND received_date <  (date_trunc('month', now()) + INTERVAL '1 month')::date
  ), 0) AS recebido_mes_atual,
  COALESCE(SUM(commission_value) FILTER (
    WHERE status = 'prevista'
      AND expected_date >= date_trunc('month', now())::date
      AND expected_date <  (date_trunc('month', now()) + INTERVAL '1 month')::date
  ), 0) AS previsto_mes_atual,
  COUNT(*) FILTER (WHERE status = 'recebida') AS qtd_recebidas,
  COUNT(*) FILTER (WHERE status = 'prevista') AS qtd_previstas
FROM public.commissions
GROUP BY owner_id;

GRANT SELECT ON public.v_financeiro_resumo TO authenticated;

CREATE OR REPLACE VIEW public.v_fluxo_mensal
WITH (security_invoker = true) AS
WITH meses AS (
  SELECT to_char(date_trunc('month', now()) - (n || ' month')::interval, 'YYYY-MM') AS mes
  FROM generate_series(0, 11) n
)
SELECT
  c.owner_id,
  m.mes,
  COALESCE(SUM(c.commission_value) FILTER (
    WHERE c.status = 'recebida' AND to_char(c.received_date, 'YYYY-MM') = m.mes
  ), 0) AS realizado,
  COALESCE(SUM(c.commission_value) FILTER (
    WHERE c.status = 'prevista' AND to_char(c.expected_date, 'YYYY-MM') = m.mes
  ), 0) AS previsto
FROM meses m
CROSS JOIN public.commissions c
GROUP BY c.owner_id, m.mes
ORDER BY m.mes DESC;

GRANT SELECT ON public.v_fluxo_mensal TO authenticated;
