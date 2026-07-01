-- Fase 4: Regras de Recorrência + coluna recurrence_rule_id em transactions

-- ─── recurrence_rules table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  account_id           uuid REFERENCES public.accounts(id),
  credit_card_id       uuid REFERENCES public.credit_cards(id),
  category_id          uuid NOT NULL REFERENCES public.categories(id),
  type                 text NOT NULL CHECK (type IN ('despesa', 'receita')),
  amount               numeric(18,8) NOT NULL CHECK (amount > 0),
  currency             text NOT NULL CHECK (currency IN ('BRL','USD','BTC')),
  description          text,
  frequency            text NOT NULL CHECK (frequency IN ('diaria','semanal','mensal','anual')),
  next_occurrence_date date NOT NULL,
  end_date             date,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid,
  deleted_at           timestamptz,
  deleted_by           uuid,
  CONSTRAINT chk_account_or_card CHECK (
    (account_id IS NOT NULL AND credit_card_id IS NULL) OR
    (account_id IS NULL     AND credit_card_id IS NOT NULL)
  )
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_not_deleted" ON public.recurrence_rules
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "insert_own" ON public.recurrence_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON public.recurrence_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER set_recurrence_rules_audit
  BEFORE INSERT OR UPDATE ON public.recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── FK + coluna de data de referência em transactions ──────────────────────
-- recurrence_date armazena o dia da ocorrência (sem hora) para uso na constraint
-- de idempotência — evita funcionar com expressões em colunas geradas ou índices
-- funcionais sobre timestamptz (que não são IMMUTABLE no PostgreSQL padrão).

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurrence_rule_id uuid REFERENCES public.recurrence_rules(id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurrence_date date;

-- Índice de idempotência: no máximo um lançamento por regra por data de ocorrência.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_recurrence_unique
  ON public.transactions (recurrence_rule_id, recurrence_date)
  WHERE recurrence_rule_id IS NOT NULL;

-- ─── generate_recurrences ───────────────────────────────────────────────────

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
      AND account_id IS NOT NULL   -- suporte a cartão reservado para V2
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
        v_rule.user_id,
        v_rule.account_id,
        v_rule.category_id,
        v_signed_amount,
        v_rule.currency,
        v_rule.description,
        v_rule.type,
        'efetivado',
        v_rule.next_occurrence_date::timestamptz,
        v_rule.id,
        v_rule.next_occurrence_date   -- coluna simples date → index IMMUTABLE
      )
      ON CONFLICT (recurrence_rule_id, recurrence_date) DO NOTHING;

      -- Avança a próxima ocorrência
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

GRANT EXECUTE ON FUNCTION public.generate_recurrences() TO anon, authenticated;
