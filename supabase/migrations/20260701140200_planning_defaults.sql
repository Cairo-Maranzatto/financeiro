-- Adiciona DEFAULT auth.uid() para budgets e recurrence_rules
-- (mesmo padrão da migration core_ledger_defaults da Fase 1)
-- Permite insert sem passar user_id explicitamente do cliente.

ALTER TABLE public.budgets
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.recurrence_rules
  ALTER COLUMN user_id SET DEFAULT auth.uid();
