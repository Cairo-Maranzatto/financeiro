-- Fase 5: Empréstimos

-- ─── loans table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loans (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id             uuid NOT NULL REFERENCES auth.users(id),
  name                text NOT NULL,
  principal_amount    numeric(18,8) NOT NULL CHECK (principal_amount > 0),
  interest_rate       numeric(7,4) NOT NULL CHECK (interest_rate >= 0),
  installments_count  int NOT NULL CHECK (installments_count > 0),
  currency            text NOT NULL CHECK (currency IN ('BRL','USD','BTC')),
  default_account_id  uuid REFERENCES public.accounts(id),
  status              text NOT NULL CHECK (status IN ('Ativo','Quitado','Cancelado')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid,
  deleted_at          timestamptz,
  deleted_by          uuid
);

ALTER TABLE public.loans ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_not_deleted" ON public.loans
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "insert_own" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER set_loans_audit
  BEFORE INSERT OR UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── loan_installments table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.loan_installments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  loan_id             uuid NOT NULL REFERENCES public.loans(id),
  installment_number  int NOT NULL,
  amount              numeric(18,8) NOT NULL CHECK (amount > 0),
  due_date            date NOT NULL,
  status              text NOT NULL CHECK (status IN ('Pendente','Pago','Vencido')) DEFAULT 'Pendente',
  transaction_id      uuid REFERENCES public.transactions(id),
  UNIQUE (loan_id, installment_number)
);

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON public.loan_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id AND l.user_id = auth.uid() AND l.deleted_at IS NULL
    )
  );

CREATE POLICY "insert_own" ON public.loan_installments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own" ON public.loan_installments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id AND l.user_id = auth.uid()
    )
  );

-- ─── criar_emprestimo ────────────────────────────────────────────────────────
-- Cria empréstimo + parcelas pré-calculadas pelo cliente em uma única transação.
-- Mesmo padrão de registrar_compra_cartao: cliente calcula, RPC insere atomicamente.

CREATE OR REPLACE FUNCTION public.criar_emprestimo(
  p_name               text,
  p_principal_amount   numeric,
  p_interest_rate      numeric,
  p_installments_count int,
  p_currency           text,
  p_default_account_id uuid,
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
    installments_count, currency, default_account_id, status
  ) VALUES (
    auth.uid(), p_name, p_principal_amount, p_interest_rate,
    p_installments_count, p_currency, p_default_account_id, 'Ativo'
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

GRANT EXECUTE ON FUNCTION public.criar_emprestimo(text, numeric, numeric, int, text, uuid, jsonb)
  TO anon, authenticated;

-- ─── pagar_parcela_emprestimo ─────────────────────────────────────────────────

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
  -- Valida que a parcela pertence ao usuário atual
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

  -- Lançamento de despesa na conta
  INSERT INTO public.transactions (
    user_id, account_id, amount, currency,
    description, type, status, occurred_at
  ) VALUES (
    auth.uid(),
    p_account_id,
    -ABS(v_inst.amount),
    v_loan.currency,
    'Parcela ' || v_inst.installment_number || '/' || v_loan.installments_count || ' — ' || v_loan.name,
    'despesa',
    'efetivado',
    p_paid_at
  )
  RETURNING id INTO v_tx_id;

  -- Marca parcela como paga
  UPDATE public.loan_installments
  SET status = 'Pago', transaction_id = v_tx_id
  WHERE id = p_installment_id;

  -- Quita o empréstimo se todas as parcelas foram pagas
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
