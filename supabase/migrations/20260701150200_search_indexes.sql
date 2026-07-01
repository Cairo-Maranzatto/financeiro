-- Fase 5: Índices de texto para busca global (Omnisearch — RF09)
-- pg_trgm permite ILIKE e % em índices GIN para consultas eficientes.
-- Scale note: para > 100k transações, adicionar indexes GIN com gin_trgm_ops.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Índice composto nas colunas mais consultadas para ILIKE
CREATE INDEX IF NOT EXISTS idx_transactions_description_search
  ON public.transactions (user_id, description)
  WHERE deleted_at IS NULL AND description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_name_search
  ON public.accounts (user_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_goals_name_search
  ON public.goals (user_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_loans_name_search
  ON public.loans (user_id, name)
  WHERE deleted_at IS NULL;
