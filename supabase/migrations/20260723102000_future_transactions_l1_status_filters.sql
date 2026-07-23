-- Fase L1: Previsto x Realizado (core)
-- Objetivo: garantir que agregações de saldo/dash/orçamento representem apenas
-- valores realizados (status = 'Pago').

-- -------------------------------------------------------------------------
-- 1) Saldos por moeda: excluir pendentes/vencidos/cancelados
-- -------------------------------------------------------------------------
create or replace function public.get_balances_by_currency()
returns table (currency text, balance numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.currency::text,
    coalesce(sum(t.amount), 0) as balance
  from public.accounts a
  left join public.transactions t
    on t.account_id = a.id
   and t.deleted_at is null
   and t.status = 'Pago'
  where a.user_id = auth.uid()
    and a.deleted_at is null
  group by a.currency
  order by a.currency;
$$;

-- -------------------------------------------------------------------------
-- 2) Despesas por categoria-pai: somente realizadas
-- -------------------------------------------------------------------------
create or replace function public.get_category_expenses_by_parent(
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
    and t.status = 'Pago'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive
  group by coalesce(c.parent_category_id, c.id), coalesce(c_pai.name, c.name),
           coalesce(c_pai.system_category_id, c.system_category_id)
  order by total desc;
$$;

-- -------------------------------------------------------------------------
-- 3) Total do mês (despesas): somente realizadas
-- -------------------------------------------------------------------------
create or replace function public.get_month_expenses_total(
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
  select coalesce(abs(sum(t.amount)), 0)
  from public.transactions t
  where t.user_id = auth.uid()
    and t.type = 'despesa'
    and t.status = 'Pago'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive;
$$;

-- -------------------------------------------------------------------------
-- 4) Total do mês (receitas): somente realizadas
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
    and t.status = 'Pago'
    and t.deleted_at is null
    and (t.occurred_at at time zone p_timezone)::date >= p_start
    and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive;
$$;

-- -------------------------------------------------------------------------
-- 5) Orçamentos (spent/percentage): somente despesas realizadas
-- -------------------------------------------------------------------------
create or replace function public.get_budgets_with_usage(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text default 'UTC'
)
returns table (
  id              uuid,
  category_id     uuid,
  category_name   text,
  amount_limit    numeric,
  spent           numeric,
  percentage      numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.id,
    b.category_id,
    c.name::text as category_name,
    b.amount_limit,
    coalesce(abs(sum(t.amount)), 0) as spent,
    case when b.amount_limit > 0 then
      round(coalesce(abs(sum(t.amount)), 0) / b.amount_limit * 100, 1)
    else 0::numeric end as percentage
  from public.budgets b
  join public.categories c
    on c.id = b.category_id
   and c.deleted_at is null
  left join public.categories c_filha
    on c_filha.parent_category_id = b.category_id
   and c_filha.deleted_at is null
  left join public.transactions t
    on t.category_id = c_filha.id
   and t.user_id = auth.uid()
   and t.type = 'despesa'
   and t.status = 'Pago'
   and t.deleted_at is null
   and (t.occurred_at at time zone p_timezone)::date >= p_start
   and (t.occurred_at at time zone p_timezone)::date <  p_end_exclusive
  where b.user_id = auth.uid()
    and b.deleted_at is null
    and b.reference_month = p_start
  group by b.id, b.category_id, c.name, b.amount_limit
  order by percentage desc, b.amount_limit desc;
$$;
