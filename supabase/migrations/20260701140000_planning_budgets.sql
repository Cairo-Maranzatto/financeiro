-- Fase 4: Orçamentos (Budgets)

-- ─── budgets table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.budgets (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  category_id      uuid NOT NULL REFERENCES public.categories(id),
  amount_limit     numeric(18,8) NOT NULL CHECK (amount_limit > 0),
  reference_month  date NOT NULL,  -- = start de resolveFinancialMonth (YYYY-MM-DD)
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid,
  deleted_at       timestamptz,
  deleted_by       uuid,
  UNIQUE (user_id, category_id, reference_month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_not_deleted" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "insert_own" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER set_budgets_audit
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── get_budgets_with_usage ─────────────────────────────────────────────────
-- Retorna todos os orçamentos do mês financeiro atual (reference_month = p_start)
-- com o valor já gasto no período, calculado no timezone do usuário.
-- Reaproveia o mesmo filtro de timezone de get_category_expenses (Fase 3).

CREATE OR REPLACE FUNCTION public.get_budgets_with_usage(
  p_start          date,
  p_end_exclusive  date,
  p_timezone       text DEFAULT 'UTC'
)
RETURNS TABLE (
  id              uuid,
  category_id     uuid,
  category_name   text,
  amount_limit    numeric,
  spent           numeric,
  percentage      numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.category_id,
    c.name::text            AS category_name,
    b.amount_limit,
    COALESCE(ABS(SUM(t.amount)), 0) AS spent,
    CASE WHEN b.amount_limit > 0 THEN
      ROUND(COALESCE(ABS(SUM(t.amount)), 0) / b.amount_limit * 100, 1)
    ELSE 0::numeric END     AS percentage
  FROM public.budgets b
  JOIN public.categories c
    ON c.id = b.category_id
   AND c.deleted_at IS NULL
  LEFT JOIN public.transactions t
    ON t.category_id = b.category_id
   AND t.user_id     = auth.uid()
   AND t.type        = 'despesa'
   AND t.deleted_at IS NULL
   AND (t.occurred_at AT TIME ZONE p_timezone)::date >= p_start
   AND (t.occurred_at AT TIME ZONE p_timezone)::date <  p_end_exclusive
  WHERE b.user_id          = auth.uid()
    AND b.deleted_at IS NULL
    AND b.reference_month  = p_start
  GROUP BY b.id, b.category_id, c.name, b.amount_limit
  ORDER BY percentage DESC, b.amount_limit DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_budgets_with_usage(date, date, text) TO anon, authenticated;
