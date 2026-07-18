CREATE OR REPLACE VIEW public.v_dashboard_prioritarios
WITH (security_invoker = true) AS
SELECT
  id, nome, telefone, whatsapp, email,
  etapa_funil, prioridade, temperatura, score,
  ultimo_contato, proximo_followup, origem_lead, status
FROM public.clients
WHERE deleted_at IS NULL AND status = 'ativo'
ORDER BY
  CASE prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 WHEN 'baixa' THEN 4 END ASC,
  score DESC,
  proximo_followup ASC NULLS LAST
LIMIT 10;

GRANT SELECT ON public.v_dashboard_prioritarios TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_atividades_hoje
WITH (security_invoker = true) AS
SELECT
  COUNT(*)                                                                                    AS total_hoje,
  COUNT(*) FILTER (WHERE type = 'TASK')                                                       AS tarefas_hoje,
  COUNT(*) FILTER (WHERE type = 'FOLLOWUP')                                                   AS followups_hoje,
  COUNT(*) FILTER (WHERE type = 'VISIT')                                                      AS visitas_hoje,
  COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('COMPLETED','CANCELLED'))           AS atrasadas
FROM public.activities
WHERE deleted_at IS NULL
  AND status NOT IN ('COMPLETED','CANCELLED')
  AND (scheduled_at::date = CURRENT_DATE OR due_at::date = CURRENT_DATE);

GRANT SELECT ON public.v_dashboard_atividades_hoje TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_indicadores
WITH (security_invoker = true) AS
SELECT
  COUNT(*) FILTER (WHERE etapa_funil = 'novo_lead')         AS leads_captacao,
  COUNT(*) FILTER (WHERE etapa_funil = 'contato_iniciado')  AS leads_contato,
  COUNT(*) FILTER (WHERE etapa_funil = 'qualificacao')      AS leads_qualificados,
  COUNT(*) FILTER (WHERE etapa_funil = 'visita_agendada')   AS leads_visita,
  COUNT(*) FILTER (WHERE etapa_funil = 'proposta')          AS leads_proposta,
  COUNT(*) FILTER (WHERE etapa_funil = 'negociacao')        AS leads_negociacao,
  COUNT(*) FILTER (WHERE etapa_funil = 'fechado_ganho')     AS leads_ganhos,
  COUNT(*) FILTER (WHERE etapa_funil = 'fechado_perdido')   AS leads_perdidos,
  COALESCE(SUM(valor_negociado) FILTER (
    WHERE status = 'ativo'
      AND etapa_funil NOT IN ('fechado_ganho','fechado_perdido')
      AND valor_negociado IS NOT NULL
  ), 0) AS receita_potencial,
  COUNT(*) FILTER (WHERE origem_lead IS NOT NULL)           AS leads_com_origem,
  COUNT(*) FILTER (
    WHERE status = 'ativo'
      AND (ultimo_contato IS NULL OR ultimo_contato < now() - INTERVAL '30 days')
  )                                                         AS clientes_inativos,
  ROUND(AVG(score)::numeric, 1)                             AS score_medio
FROM public.clients
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_dashboard_indicadores TO authenticated;