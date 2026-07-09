-- Hotfix descoberto durante a Fase A0 do aprimoramento de categorias
-- (fases/aprimoramento/FASE_A00_SCHEMA_TAXONOMIA.md): pagar_fatura() busca a categoria
-- "Pagamento de Cartão" do usuário via um subquery escalar em system_categories filtrando
-- só por name. A partir da migration 20260708140000 (Fase A0) existem DUAS linhas com esse
-- nome em system_categories (a legada, agora is_active = false, e a nova, is_active = true)
-- — o subquery escalar passa a retornar 2 linhas e o Postgres lança
-- "more than one row returned by a subquery used as an expression" na primeira tentativa
-- de pagar uma fatura. Corrigido para filtrar explicitamente a linha ativa.
create or replace function public.pagar_fatura(
  p_invoice_id uuid,
  p_account_id uuid,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql
as $$
declare
  v_invoice record;
  v_total numeric(18, 8);
  v_pagamento_category_id uuid;
begin
  select i.*, c.user_id as card_user_id
  into v_invoice
  from public.invoices i
  join public.credit_cards c on c.id = i.credit_card_id
  where i.id = p_invoice_id
    and c.user_id = auth.uid();

  if not found then
    raise exception 'Fatura não encontrada ou acesso não permitido.';
  end if;

  if v_invoice.status = 'Paga' then
    raise exception 'Esta fatura já foi paga.';
  end if;

  v_total := public.get_invoice_total(p_invoice_id);

  if v_total <= 0 then
    raise exception 'A fatura não possui valor a pagar.';
  end if;

  -- Categoria "Pagamento de Cartão" do usuário (filtra a linha ATIVA de system_categories —
  -- necessário desde a Fase A0, que passou a manter uma linha legada inativa com o mesmo nome)
  select id into v_pagamento_category_id
  from public.categories
  where user_id = auth.uid()
    and system_category_id = (
      select id from public.system_categories where name = 'Pagamento de Cartão' and is_active = true
    )
  limit 1;

  -- Débito na conta de origem
  insert into public.transactions (
    user_id, account_id, category_id, type, status, amount, currency,
    description, occurred_at, paid_at
  ) values (
    auth.uid(), p_account_id, v_pagamento_category_id, 'despesa', 'Pago', -v_total,
    (select currency from public.accounts where id = p_account_id),
    'Pagamento de fatura: ' || v_invoice.reference_month::text,
    p_paid_at, p_paid_at
  );

  -- Marca as transações da fatura como pagas
  update public.transactions
  set status = 'Pago', paid_at = p_paid_at
  where invoice_id = p_invoice_id
    and deleted_at is null;

  -- Atualiza status da fatura
  update public.invoices
  set status = 'Paga', paid_at = p_paid_at
  where id = p_invoice_id;
end;
$$;
