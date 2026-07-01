-- Função chamada pelo Vercel Cron diário (/api/cron/close-invoices).
-- SECURITY DEFINER: opera sobre todos os usuários (ignora RLS), necessário
-- para um cron sistêmico — a proteção contra chamada indevida fica no
-- próprio Route Handler via CRON_SECRET.
create or replace function public.close_due_invoices()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Faturas 'Aberta' cujo closing_date chegou: → 'Fechada'.
  -- closing_date é plain `date` já calculada no timezone do usuário
  -- quando a fatura foi criada, portanto current_date (UTC date) é
  -- suficiente para o cron diário (tolerância de até 24 h é aceitável
  -- para fechamento administrativo — o usuário vê a fatura Fechada no
  -- máximo um dia depois do fechamento real, Risco 2 / Seção 24 anotado).
  update public.invoices
  set status = 'Fechada'
  where status = 'Aberta'
    and closing_date <= current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
