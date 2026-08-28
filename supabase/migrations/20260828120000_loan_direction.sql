-- Adiciona direção aos empréstimos: tomado (dívida) ou concedido (crédito)

-- 1. Adiciona coluna direction com default para registros existentes
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'tomado'
  CHECK (direction IN ('tomado', 'concedido'));

-- 2. Atualiza a função de criação para receber a direção
CREATE OR REPLACE FUNCTION public.criar_emprestimo(
  p_name               text,
  p_principal_amount   numeric,
  p_interest_rate      numeric,
  p_installments_count int,
  p_currency           text,
  p_default_account_id uuid,
  p_direction          text,
  p_installments       jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_loan_id uuid;
  v_item    jsonb;
BEGIN
  INSERT INTO public.loans (
    user_id, name, principal_amount, interest_rate,
    installments_count, currency, default_account_id, direction, status
  ) VALUES (
    auth.uid(), p_name, p_principal_amount, p_interest_rate,
    p_installments_count, p_currency, p_default_account_id, p_direction, 'Ativo'
  )
  RETURNING id INTO v_loan_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_installments)
  LOOP
    INSERT INTO public.loan_installments (
      loan_id, installment_number, amount, due_date, status
    ) VALUES (
      v_loan_id,
      (v_item->>'installmentNumber')::int,
      (v_item->>'amount')::numeric,
      (v_item->>'dueDate')::date,
      'Pendente'
    );
  END LOOP;

  RETURN v_loan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_emprestimo(text, numeric, numeric, int, text, uuid, text, jsonb)
  TO anon, authenticated;

-- 3. Atualiza a função de quitação para tratar os dois lados
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
  v_amount numeric(18,8);
  v_tx_type text;
  v_description text;
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

  IF v_loan.direction = 'concedido' THEN
    v_amount := ABS(v_inst.amount);
    v_tx_type := 'receita';
    v_description := 'Recebimento parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name;
  ELSE
    v_amount := -ABS(v_inst.amount);
    v_tx_type := 'despesa';
    v_description := 'Parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name;
  END IF;

  INSERT INTO public.transactions (
    user_id, account_id, amount, currency,
    description, type, status, occurred_at
  ) VALUES (
    auth.uid(), p_account_id, v_amount, v_loan.currency,
    v_description, v_tx_type, 'Pago', p_paid_at
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

GRANT EXECUTE ON FUNCTION public.pagar_parcela_emprestimo(uuid, uuid, timestamptz)
  TO anon, authenticated;
