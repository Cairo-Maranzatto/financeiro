-- Functions for Advanced Reports
-- 1. get_report_totals: Segregated income/expense by currency
-- 2. get_report_by_category: Aggregation by category (parent or child)
-- 3. get_report_trend: Evolution of income/expense over time

CREATE OR REPLACE FUNCTION public.get_report_totals(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text DEFAULT 'UTC',
  p_account_id     uuid DEFAULT NULL
)
RETURNS TABLE (
  currency text,
  income numeric,
  expense numeric,
  net numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.currency,
    COALESCE(SUM(CASE WHEN t.type = 'receita' THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(ABS(SUM(CASE WHEN t.type = 'despesa' THEN t.amount ELSE 0 END)), 0) AS expense,
    COALESCE(SUM(CASE WHEN t.type IN ('receita', 'despesa') THEN t.amount ELSE 0 END), 0) AS net
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.status = 'Pago'
    AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
    AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive
    AND (p_account_id IS NULL OR t.account_id = p_account_id)
  GROUP BY t.currency
  ORDER BY t.currency;
$$;

CREATE OR REPLACE FUNCTION public.get_report_by_category(
  p_start          date,
  p_end_exclusive  date,
  p_type           text, -- 'receita' or 'despesa'
  p_timezone       text DEFAULT 'UTC',
  p_level          text DEFAULT 'parent', -- 'parent' or 'child'
  p_account_id     uuid DEFAULT NULL
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE 
      WHEN p_level = 'parent' THEN COALESCE(c.parent_category_id, c.id)
      ELSE c.id
    END AS category_id,
    CASE 
      WHEN p_level = 'parent' THEN COALESCE(c_pai.name, c.name)
      ELSE c.name
    END::text AS category_name,
    ABS(SUM(t.amount)) AS total
  FROM public.transactions t
  JOIN public.categories c ON c.id = t.category_id
  LEFT JOIN public.categories c_pai ON c_pai.id = c.parent_category_id
  WHERE t.user_id = auth.uid()
    AND t.type = p_type
    AND t.deleted_at IS NULL
    AND t.status = 'Pago'
    AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
    AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive
    AND (p_account_id IS NULL OR t.account_id = p_account_id)
  GROUP BY 1, 2
  ORDER BY total DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_report_trend(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text DEFAULT 'UTC',
  p_interval       text DEFAULT 'month', -- 'day', 'week', 'month'
  p_account_id     uuid DEFAULT NULL
)
RETURNS TABLE (
  period date,
  currency text,
  income numeric,
  expense numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    date_trunc(p_interval, (t.occurred_at AT TIME ZONE p_timezone))::date AS period,
    t.currency,
    COALESCE(SUM(CASE WHEN t.type = 'receita' THEN t.amount ELSE 0 END), 0) AS income,
    COALESCE(ABS(SUM(CASE WHEN t.type = 'despesa' THEN t.amount ELSE 0 END)), 0) AS expense
  FROM public.transactions t
  WHERE t.user_id = auth.uid()
    AND t.deleted_at IS NULL
    AND t.status = 'Pago'
    AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
    AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive
    AND (p_account_id IS NULL OR t.account_id = p_account_id)
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.get_report_totals(date, date, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_by_category(date, date, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_trend(date, date, text, text, uuid) TO anon, authenticated;
