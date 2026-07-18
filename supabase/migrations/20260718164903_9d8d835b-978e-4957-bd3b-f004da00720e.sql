create or replace view public.v_analytics_kpis
with (security_invoker = true) as
with base as (
  select * from public.clients where deleted_at is null
)
select
  (select count(*) from base) as total_clientes,
  (select count(*) from base where status = 'ativo') as clientes_ativos,
  (select count(*) from base where etapa_funil = 'fechamento') as vendas_concluidas,
  (select count(*) from base where status = 'perdido' or etapa_funil = 'perdido') as leads_perdidos,
  (select count(*) from base where date_trunc('month', created_at) = date_trunc('month', now())) as novos_este_mes,
  coalesce((select avg(score)::numeric from base where score is not null), 0) as score_medio,
  (select count(*) from public.activities where deleted_at is null and type = 'visita' and status = 'agendada') as visitas_agendadas,
  (select count(*) from public.client_timeline where event_type = 'proposta_enviada') as propostas_enviadas,
  (select count(*) from base where etapa_funil in ('negociacao', 'proposta')) as em_negociacao,
  (select count(*) from base where proximo_followup < now()) as followups_atrasados,
  case
    when (select count(*) from base) = 0 then 0
    else ((select count(*) from base where etapa_funil = 'fechamento')::numeric / (select count(*) from base) * 100)
  end as taxa_conversao_geral;

grant select on public.v_analytics_kpis to authenticated;
grant all on public.v_analytics_kpis to service_role;


create or replace view public.v_analytics_funil_conversao
with (security_invoker = true) as
select
  etapa_funil,
  count(*) as total,
  count(*) filter (where status = 'ativo') as convertidos,
  case
    when sum(count(*)) over () = 0 then 0
    else (count(*)::numeric / sum(count(*)) over () * 100)
  end as pct_total,
  case
    when lag(count(*)) over (order by min(created_at)) is null or lag(count(*)) over (order by min(created_at)) = 0 then 0
    else (count(*)::numeric / lag(count(*)) over (order by min(created_at)) * 100)
  end as taxa_conversao
from public.clients
where deleted_at is null
  and etapa_funil is not null
  and etapa_funil <> 'perdido'
group by etapa_funil
order by min(created_at);

grant select on public.v_analytics_funil_conversao to authenticated;
grant all on public.v_analytics_funil_conversao to service_role;


create or replace view public.v_analytics_origem_leads
with (security_invoker = true) as
select
  coalesce(origem_lead, 'Não informado') as origem,
  count(*) as total,
  count(*) filter (where etapa_funil = 'fechamento') as convertidos,
  case
    when count(*) = 0 then 0
    else (count(*) filter (where etapa_funil = 'fechamento')::numeric / count(*) * 100)
  end as taxa_conversao
from public.clients
where deleted_at is null
  and origem_lead is not null
group by origem_lead
order by count(*) desc;

grant select on public.v_analytics_origem_leads to authenticated;
grant all on public.v_analytics_origem_leads to service_role;


create or replace view public.v_analytics_atividades
with (security_invoker = true) as
select
  type,
  status,
  count(*) as total,
  count(*) filter (where due_at < now() and completed_at is null) as atrasadas
from public.activities
where deleted_at is null
  and type is not null
  and status is not null
group by type, status
order by count(*) desc;

grant select on public.v_analytics_atividades to authenticated;
grant all on public.v_analytics_atividades to service_role;


create or replace view public.v_analytics_documentos
with (security_invoker = true) as
select
  coalesce(category, 'Sem categoria') as category,
  count(*) as total,
  coalesce(sum(file_size), 0) as total_bytes,
  count(*) filter (where favorite = true) as favoritos
from public.client_documents
where deleted_at is null
group by category
order by count(*) desc;

grant select on public.v_analytics_documentos to authenticated;
grant all on public.v_analytics_documentos to service_role;


create or replace view public.v_analytics_conversas
with (security_invoker = true) as
select
  channel,
  status,
  count(*) as total,
  coalesce(sum(unread_count), 0) as mensagens_nao_lidas
from public.conversations
where deleted_at is null
  and channel is not null
  and status is not null
group by channel, status
order by count(*) desc;

grant select on public.v_analytics_conversas to authenticated;
grant all on public.v_analytics_conversas to service_role;


create or replace view public.v_analytics_timeline_eventos
with (security_invoker = true) as
select
  coalesce(category, 'geral') as category,
  event_type,
  date_trunc('month', created_at)::date as mes,
  count(*) as total
from public.client_timeline
where created_at >= (now() - interval '12 months')
  and event_type is not null
group by category, event_type, date_trunc('month', created_at)
order by date_trunc('month', created_at) desc, count(*) desc;

grant select on public.v_analytics_timeline_eventos to authenticated;
grant all on public.v_analytics_timeline_eventos to service_role;
