CREATE OR REPLACE VIEW public.v_dashboard_metricas
WITH (security_invoker = true) AS
SELECT
  COUNT(*)                                                          AS total_clientes,
  COUNT(*) FILTER (WHERE status = 'ativo')                          AS clientes_ativos,
  COUNT(*) FILTER (WHERE status = 'ganho')                          AS clientes_ganhos,
  COUNT(*) FILTER (WHERE status = 'perdido')                        AS clientes_perdidos,
  COUNT(*) FILTER (WHERE temperatura = 'quente')                    AS leads_quentes,
  COUNT(*) FILTER (WHERE temperatura = 'morno')                     AS leads_mornos,
  COUNT(*) FILTER (WHERE temperatura = 'frio')                      AS leads_frios,
  COUNT(*) FILTER (WHERE proximo_followup::date = CURRENT_DATE AND deleted_at IS NULL) AS followups_hoje,
  COUNT(*) FILTER (WHERE proximo_followup::date < CURRENT_DATE AND status = 'ativo' AND deleted_at IS NULL) AS followups_atrasados,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))  AS novos_este_mes,
  COALESCE(SUM(valor_negociado) FILTER (WHERE status = 'ganho'), 0) AS receita_total
FROM public.clients
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_dashboard_metricas TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_funil
WITH (security_invoker = true) AS
SELECT etapa_funil, COUNT(*)::int AS total
FROM public.clients
WHERE deleted_at IS NULL
GROUP BY etapa_funil;

GRANT SELECT ON public.v_dashboard_funil TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_followups_pendentes
WITH (security_invoker = true) AS
SELECT
  id, nome, telefone, whatsapp, etapa_funil, prioridade, temperatura, proximo_followup,
  CASE
    WHEN proximo_followup::date = CURRENT_DATE THEN 'hoje'
    WHEN proximo_followup::date < CURRENT_DATE  THEN 'atrasado'
  END AS situacao
FROM public.clients
WHERE deleted_at IS NULL AND status = 'ativo'
  AND proximo_followup IS NOT NULL
  AND proximo_followup::date <= CURRENT_DATE
ORDER BY proximo_followup ASC
LIMIT 20;

GRANT SELECT ON public.v_dashboard_followups_pendentes TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_recentes
WITH (security_invoker = true) AS
SELECT id, nome, etapa_funil, temperatura, prioridade, origem_lead, created_at
FROM public.clients
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

GRANT SELECT ON public.v_dashboard_recentes TO authenticated;