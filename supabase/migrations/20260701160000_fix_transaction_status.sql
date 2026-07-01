-- Corrige status 'efetivado' → 'Pago' nas RPCs de Fases 4 e 5.
-- O CHECK constraint de transactions aceita: 'Pendente','Pago','Vencido','Cancelado'.
-- 'efetivado' não está na lista — bug introduzido nas migrações anteriores.

-- ─── generate_recurrences (Fase 4) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_recurrences()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule          RECORD;
  v_count         int := 0;
  v_next_date     date;
  v_signed_amount numeric(18,8);
BEGIN
  FOR v_rule IN
    SELECT * FROM public.recurrence_rules
    WHERE next_occurrence_date <= CURRENT_DATE
      AND deleted_at IS NULL
      AND account_id IS NOT NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_signed_amount := CASE v_rule.type
        WHEN 'despesa' THEN -ABS(v_rule.amount)
        ELSE                ABS(v_rule.amount)
      END;

      INSERT INTO public.transactions (
        user_id, account_id, category_id,
        amount, currency, description, type, status,
        occurred_at, recurrence_rule_id, recurrence_date
      ) VALUES (
        v_rule.user_id, v_rule.account_id, v_rule.category_id,
        v_signed_amount, v_rule.currency, v_rule.description,
        v_rule.type, 'Pago',
        v_rule.next_occurrence_date::timestamptz,
        v_rule.id, v_rule.next_occurrence_date
      )
      ON CONFLICT (recurrence_rule_id, recurrence_date) DO NOTHING;

      v_next_date := CASE v_rule.frequency
        WHEN 'diaria'  THEN v_rule.next_occurrence_date + INTERVAL '1 day'
        WHEN 'semanal' THEN v_rule.next_occurrence_date + INTERVAL '7 days'
        WHEN 'mensal'  THEN v_rule.next_occurrence_date + INTERVAL '1 month'
        WHEN 'anual'   THEN v_rule.next_occurrence_date + INTERVAL '1 year'
      END;

      IF v_rule.end_date IS NOT NULL AND v_next_date > v_rule.end_date THEN
        UPDATE public.recurrence_rules
        SET deleted_at = now(), next_occurrence_date = v_next_date, updated_at = now()
        WHERE id = v_rule.id;
      ELSE
        UPDATE public.recurrence_rules
        SET next_occurrence_date = v_next_date, updated_at = now()
        WHERE id = v_rule.id;
      END IF;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── pagar_parcela_emprestimo (Fase 5) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pagar_parcela_emprestimo(
  p_installment_id uuid,
  p_account_id     uuid,
  p_paid_at        timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_inst  loan_installments%ROWTYPE;
  v_loan  loans%ROWTYPE;
  v_tx_id uuid;
BEGIN
  SELECT li.* INTO v_inst
  FROM public.loan_installments li
  JOIN public.loans l ON l.id = li.loan_id
  WHERE li.id = p_installment_id
    AND l.user_id = auth.uid()
    AND l.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada.';
  END IF;

  IF v_inst.status = 'Pago' THEN
    RAISE EXCEPTION 'Esta parcela já foi paga.';
  END IF;

  SELECT * INTO v_loan FROM public.loans WHERE id = v_inst.loan_id;

  INSERT INTO public.transactions (
    user_id, account_id, amount, currency,
    description, type, status, occurred_at
  ) VALUES (
    auth.uid(), p_account_id, -ABS(v_inst.amount), v_loan.currency,
    'Parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name,
    'despesa', 'Pago', p_paid_at
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.loan_installments
  SET status = 'Pago', transaction_id = v_tx_id
  WHERE id = p_installment_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.loan_installments
    WHERE loan_id = v_inst.loan_id AND status != 'Pago'
  ) THEN
    UPDATE public.loans
    SET status = 'Quitado', updated_at = now()
    WHERE id = v_inst.loan_id;
  END IF;

  RETURN v_tx_id;
END;
$$;

-- ─── alocar_recurso_na_meta (Fase 5) ─────────────────────────────────────────

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

  IF p_account_id IS NOT NULL THEN
    INSERT INTO public.transactions (
      user_id, account_id, amount, currency,
      description, type, status, occurred_at
    ) VALUES (
      auth.uid(), p_account_id, -ABS(p_amount), v_goal.currency,
      'Aporte — ' || v_goal.name,
      'despesa', 'Pago', p_at
    )
    RETURNING id INTO v_tx_id;
  END IF;

  INSERT INTO public.goal_allocations (goal_id, user_id, amount, note, transaction_id)
  VALUES (p_goal_id, auth.uid(), p_amount, p_note, v_tx_id)
  RETURNING id INTO v_allocation_id;

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
