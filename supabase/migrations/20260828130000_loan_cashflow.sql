-- Fase 5-A: Empréstimos com fluxo de caixa e categorias

-- 1. Adiciona colunas de origem e destino (nullable para preservar empréstimos antigos)
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS source_account_id uuid REFERENCES public.accounts(id),
  ADD COLUMN IF NOT EXISTS destination_account_id uuid REFERENCES public.accounts(id);

-- 2. Cria as categorias necessárias para cada usuário que ainda não as possua

-- 2.1. 'Pagamento de Empréstimo' (despesa) filha de 'Finanças & Impostos'
INSERT INTO public.categories (user_id, name, type, parent_category_id, icon)
SELECT
  c.user_id,
  'Pagamento de Empréstimo',
  'Despesa',
  c.id,
  'receipt'
FROM public.categories c
WHERE c.name = 'Finanças & Impostos'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories cc
    WHERE cc.user_id = c.user_id
      AND cc.name = 'Pagamento de Empréstimo'
      AND cc.deleted_at IS NULL
  );

-- 2.2. 'Empréstimo Concedido' (despesa) filha de 'Finanças & Impostos'
INSERT INTO public.categories (user_id, name, type, parent_category_id, icon)
SELECT
  c.user_id,
  'Empréstimo Concedido',
  'Despesa',
  c.id,
  'receipt'
FROM public.categories c
WHERE c.name = 'Finanças & Impostos'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories cc
    WHERE cc.user_id = c.user_id
      AND cc.name = 'Empréstimo Concedido'
      AND cc.deleted_at IS NULL
  );

-- 2.3. 'Recebimento de Empréstimo Concedido' (receita)
-- Nota: não é possível vincular a 'Finanças & Impostos' porque essa categoria-pai
-- é do tipo 'Despesa' e o sistema exige que a subcategoria herde o mesmo tipo.
-- Optamos por criá-la como categoria-pai do tipo 'Receita' (parent_category_id = NULL).
INSERT INTO public.categories (user_id, name, type, parent_category_id, icon)
SELECT
  c.user_id,
  'Recebimento de Empréstimo Concedido',
  'Receita',
  NULL,
  'receipt'
FROM public.categories c
WHERE c.name = 'Finanças & Impostos'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.categories cc
    WHERE cc.user_id = c.user_id
      AND cc.name = 'Recebimento de Empréstimo Concedido'
      AND cc.deleted_at IS NULL
  );

-- 3. Atualiza a função de criação para criar a transação inicial de caixa
CREATE OR REPLACE FUNCTION public.criar_emprestimo(
  p_name               text,
  p_principal_amount   numeric,
  p_interest_rate      numeric,
  p_installments_count int,
  p_currency           text,
  p_default_account_id uuid,
  p_source_account_id  uuid,
  p_destination_account_id uuid,
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
  v_category_id uuid;
  v_tx_id   uuid;
  v_account_id uuid;
  v_amount  numeric(18,8);
  v_tx_type text;
  v_description text;
BEGIN
  INSERT INTO public.loans (
    user_id, name, principal_amount, interest_rate,
    installments_count, currency, default_account_id,
    source_account_id, destination_account_id, direction, status
  ) VALUES (
    auth.uid(), p_name, p_principal_amount, p_interest_rate,
    p_installments_count, p_currency, p_default_account_id,
    p_source_account_id, p_destination_account_id, p_direction, 'Ativo'
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

  -- Cria a transação inicial de caixa
  IF p_direction = 'concedido' THEN
    v_account_id := p_source_account_id;
    v_amount := -ABS(p_principal_amount);
    v_tx_type := 'despesa';
    v_description := 'Empréstimo concedido — ' || p_name;

    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = auth.uid()
      AND name = 'Empréstimo Concedido'
      AND deleted_at IS NULL
    LIMIT 1;
  ELSE
    v_account_id := p_destination_account_id;
    v_amount := ABS(p_principal_amount);
    v_tx_type := 'receita';
    v_description := 'Crédito do empréstimo — ' || p_name;

    SELECT id INTO v_category_id
    FROM public.categories
    WHERE user_id = auth.uid()
      AND name = 'Outras / Não Categorizado'
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  INSERT INTO public.transactions (
    user_id, account_id, category_id, amount, currency,
    description, type, status, occurred_at
  ) VALUES (
    auth.uid(), v_account_id, v_category_id, v_amount, p_currency,
    v_description, v_tx_type, 'Pago', now()
  )
  RETURNING id INTO v_tx_id;

  RETURN v_loan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_emprestimo(
  text, numeric, numeric, int, text, uuid, uuid, uuid, text, jsonb
) TO anon, authenticated;

-- 4. Atualiza a função de quitação para usar categorias
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
  v_category_id uuid;
  v_is_new_style boolean;
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

  v_is_new_style := (
    (v_loan.direction = 'concedido' AND v_loan.source_account_id IS NOT NULL)
    OR (v_loan.direction = 'tomado' AND v_loan.destination_account_id IS NOT NULL)
  );

  IF v_loan.direction = 'concedido' THEN
    v_amount := ABS(v_inst.amount);
    v_tx_type := 'receita';
    v_description := 'Recebimento parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name;

    IF v_is_new_style THEN
      SELECT id INTO v_category_id
      FROM public.categories
      WHERE user_id = auth.uid()
        AND name = 'Recebimento de Empréstimo Concedido'
        AND deleted_at IS NULL
      LIMIT 1;
    END IF;
  ELSE
    v_amount := -ABS(v_inst.amount);
    v_tx_type := 'despesa';
    v_description := 'Pagamento parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name;

    IF v_is_new_style THEN
      SELECT id INTO v_category_id
      FROM public.categories
      WHERE user_id = auth.uid()
        AND name = 'Pagamento de Empréstimo'
        AND deleted_at IS NULL
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.transactions (
    user_id, account_id, category_id, amount, currency,
    description, type, status, occurred_at
  ) VALUES (
    auth.uid(), p_account_id, v_category_id, v_amount, v_loan.currency,
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
