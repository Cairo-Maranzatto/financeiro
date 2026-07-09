-- Fase A5 do aprimoramento de categorias (fases/aprimoramento/FASE_A05_DASHBOARD_INDICADORES.md)
-- Rollup por categoria-pai sem limite (para permitir extrair um pai específico, ex: "Moradia",
-- além do top-5 exibido) + nova função de total de receitas do mês (faltava — só existia total
-- de despesas), necessárias para os indicadores de Taxa de Poupança e Comprometimento com Moradia.

-- -------------------------------------------------------------------------
-- 1. get_category_expenses_by_parent sem LIMIT (a Fase A2 criou com LIMIT 5, pensada só para
--    exibição de "top categorias" — agora também precisa alimentar indicadores que exigem o
--    total de UM pai específico, mesmo que ele não esteja no top 5). Também expõe
--    parent_system_category_id para permitir identificar uma categoria-pai do catálogo global
--    (ex: "Moradia") de forma estrutural, sem comparar por nome (mesma lição da Fase A1).
-- -------------------------------------------------------------------------
-- Postgres não permite CREATE OR REPLACE mudar o shape de RETURNS TABLE — precisa dropar antes.
drop function if exists public.get_category_expenses_by_parent(date, date, text);

create function public.get_category_expenses_by_parent(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text default 'UTC'
)
returns table (
  parent_category_id uuid,
  parent_category_name text,
  parent_system_category_id uuid,
  total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(c.parent_category_id, c.id) as parent_category_id,
    coalesce(c_pai.name, c.name)::text   as parent_category_name,
    coalesce(c_pai.system_category_id, c.system_category_id) as parent_system_category_id,
    abs(sum(t.amount))                   as total
  from public.transactions t
  join public.categories c
    on c.id = t.category_id
   and c.deleted_at is null
  left join public.categories c_pai
    on c_pai.id = c.parent_category_id
   and c_pai.deleted_at is null
  where t.user_id = auth.uid()
    and t.type = 'despesa'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive
  group by coalesce(c.parent_category_id, c.id), coalesce(c_pai.name, c.name),
           coalesce(c_pai.system_category_id, c.system_category_id)
  order by total desc;
$$;

-- -------------------------------------------------------------------------
-- 2. get_month_income_total — total de receitas do mês (faltava; só existia o de despesas).
--    Necessário para Taxa de Poupança e Comprometimento com Moradia.
-- -------------------------------------------------------------------------
create or replace function public.get_month_income_total(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text default 'UTC'
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(t.amount), 0)
  from public.transactions t
  where t.user_id = auth.uid()
    and t.type = 'receita'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive;
$$;

grant execute on function public.get_month_income_total(date, date, text) to anon, authenticated;
grant execute on function public.get_category_expenses_by_parent(date, date, text) to anon, authenticated;
