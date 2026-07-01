-- Fase 5: Metas Financeiras (Goals)

-- ─── goals table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  name           text NOT NULL,
  target_amount  numeric(18,8) NOT NULL CHECK (target_amount > 0),
  currency       text NOT NULL CHECK (currency IN ('BRL','USD','BTC')),
  target_date    date,
  status         text NOT NULL CHECK (status IN ('Em andamento','Concluída','Cancelada')) DEFAULT 'Em andamento',
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  deleted_at     timestamptz,
  deleted_by     uuid
);

ALTER TABLE public.goals ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_not_deleted" ON public.goals
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER set_goals_audit
  BEFORE INSERT OR UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── goal_allocations table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goal_allocations (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  goal_id        uuid NOT NULL REFERENCES public.goals(id),
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  amount         numeric(18,8) NOT NULL CHECK (amount > 0),
  note           text,
  transaction_id uuid REFERENCES public.transactions(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_allocations ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.goal_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.goal_allocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON public.goal_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── alocar_recurso_na_meta ───────────────────────────────────────────────────
-- Registra um aporte na meta.
-- Se p_account_id não for nulo, debita a conta e vincula a transaction_id.
-- Dispara GoalCompleted (muda status → Concluída) quando current >= target.

CREATE OR REPLACE FUNCTION public.alocar_recurso_na_meta(
  p_goal_id    uuid,
  p_amount     numeric,
  p_account_id uuid    DEFAULT NULL,
  p_note       text    DEFAULT NULL,
  p_at         timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_goal           goals%ROWTYPE;
  v_allocation_id  uuid;
  v_tx_id          uuid;
  v_current_amount numeric;
BEGIN
  SELECT * INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND user_id = auth.uid() AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada.';
  END IF;

  IF v_goal.status != 'Em andamento' THEN
    RAISE EXCEPTION 'Meta não está em andamento.';
  END IF;

  -- Débito opcional na conta (movimento real de dinheiro)
  IF p_account_id IS NOT NULL THEN
    INSERT INTO public.transactions (
      user_id, account_id, amount, currency,
      description, type, status, occurred_at
    ) VALUES (
      auth.uid(), p_account_id, -ABS(p_amount), v_goal.currency,
      'Aporte — ' || v_goal.name,
      'despesa', 'efetivado', p_at
    )
    RETURNING id INTO v_tx_id;
  END IF;

  INSERT INTO public.goal_allocations (goal_id, user_id, amount, note, transaction_id)
  VALUES (p_goal_id, auth.uid(), p_amount, p_note, v_tx_id)
  RETURNING id INTO v_allocation_id;

  -- Dispara GoalCompleted
  SELECT COALESCE(SUM(amount), 0) INTO v_current_amount
  FROM public.goal_allocations
  WHERE goal_id = p_goal_id;

  IF v_current_amount >= v_goal.target_amount THEN
    UPDATE public.goals
    SET status = 'Concluída', updated_at = now()
    WHERE id = p_goal_id;
  END IF;

  RETURN v_allocation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.alocar_recurso_na_meta(uuid, numeric, uuid, text, timestamptz)
  TO anon, authenticated;
