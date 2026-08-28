-- Backfill: garante que todos os empréstimos existentes sem direção sejam 'tomado'.
-- Execute este script no SQL Editor do Supabase ou via psql contra a produção.

UPDATE public.loans
SET direction = 'tomado'
WHERE direction IS NULL
  OR direction = '';

-- Exibe os empréstimos ajustados (apenas para conferência).
SELECT id, name, direction, principal_amount, currency, status
FROM public.loans
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
