-- Dashboard aggregate functions + performance indexes
-- Fase 3: Dashboard & PWA

-- ─── Performance indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred_type
  ON public.transactions (user_id, occurred_at, type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_active
  ON public.transactions (account_id)
  WHERE deleted_at IS NULL;

-- ─── get_balances_by_currency ───────────────────────────────────────────────
-- Retorna a soma dos saldos de todas as contas do usuário, agrupada por moeda.
-- Equivale a chamar get_account_balance() para cada conta e somar por moeda,
-- mas em uma única query.

CREATE OR REPLACE FUNCTION public.get_balances_by_currency()
RETURNS TABLE (currency text, balance numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.currency::text,
    COALESCE(SUM(t.amount), 0) AS balance
  FROM public.accounts a
  LEFT JOIN public.transactions t
    ON t.account_id = a.id
   AND t.deleted_at IS NULL
  WHERE a.user_id = auth.uid()
    AND a.deleted_at IS NULL
  GROUP BY a.currency
  ORDER BY a.currency;
$$;

-- ─── get_category_expenses ──────────────────────────────────────────────────
-- Retorna o top 5 categorias por valor de despesa em um intervalo de datas.
-- p_start / p_end_exclusive são datas (sem hora) no timezone do usuário.
-- A comparação usa (occurred_at AT TIME ZONE p_timezone)::date para que
-- transações sejam classificadas pelo dia local do usuário, não pelo UTC.

CREATE OR REPLACE FUNCTION public.get_category_expenses(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text DEFAULT 'UTC'
)
RETURNS TABLE (category_id uuid, category_name text, total numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id            AS category_id,
    c.name::text    AS category_name,
    ABS(SUM(t.amount)) AS total
  FROM public.transactions t
  JOIN public.categories c
    ON c.id = t.category_id
   AND c.deleted_at IS NULL
  WHERE t.user_id  = auth.uid()
    AND t.type     = 'despesa'
    AND t.deleted_at IS NULL
    AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
    AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive
  GROUP BY c.id, c.name
  ORDER BY total DESC
  LIMIT 5;
$$;

-- ─── get_month_expenses_total ───────────────────────────────────────────────
-- Retorna o total absoluto de despesas no período (todas as categorias, não só top 5).
-- Mesmo filtro de timezone que get_category_expenses.

CREATE OR REPLACE FUNCTION public.get_month_expenses_total(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text DEFAULT 'UTC'
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(ABS(SUM(t.amount)), 0)
  FROM public.transactions t
  WHERE t.user_id  = auth.uid()
    AND t.type     = 'despesa'
    AND t.deleted_at IS NULL
    AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
    AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive;
$$;
