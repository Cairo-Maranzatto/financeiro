-- =========================================================================
-- Fase LLM 4 — Integração WhatsApp (Meta Cloud API)
-- - Tabela de vínculo telefone <-> usuário
-- - RPC de pagamento de fatura para canal service-role (webhook)
-- =========================================================================

create table public.whatsapp_links (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text not null,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  deleted_at timestamptz, deleted_by uuid,
  constraint whatsapp_links_phone_number_format_chk
    check (phone_number ~ '^[1-9][0-9]{7,15}$')
);

comment on table public.whatsapp_links is
  'Vínculo entre número de WhatsApp (formato E.164 sem +) e usuário autenticado. Usado pelo webhook da Meta Cloud API.';

create unique index whatsapp_links_phone_number_active_idx
  on public.whatsapp_links (phone_number)
  where deleted_at is null;

create unique index whatsapp_links_user_active_idx
  on public.whatsapp_links (user_id)
  where deleted_at is null;

create trigger trg_whatsapp_links_audit
  before insert or update on public.whatsapp_links
  for each row execute function public.set_audit_fields();

alter table public.whatsapp_links enable row level security;

create policy "whatsapp_links_select_own"
  on public.whatsapp_links
  for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "whatsapp_links_insert_own"
  on public.whatsapp_links
  for insert
  with check (auth.uid() = user_id);

create policy "whatsapp_links_update_own"
  on public.whatsapp_links
  for update
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

create or replace function public.pagar_fatura_por_usuario(
  p_user_id uuid,
  p_invoice_id uuid,
  p_account_id uuid,
  p_paid_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice record;
  v_account_currency text;
  v_total numeric(18, 8);
  v_pagamento_category_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Função permitida apenas para service_role.';
  end if;

  select i.*
  into v_invoice
  from public.invoices i
  join public.credit_cards c on c.id = i.credit_card_id
  where i.id = p_invoice_id
    and c.user_id = p_user_id
    and i.deleted_at is null
    and c.deleted_at is null;

  if not found then
    raise exception 'Fatura não encontrada ou acesso não permitido.';
  end if;

  if v_invoice.status = 'Paga' then
    raise exception 'Esta fatura já foi paga.';
  end if;

  select currency
  into v_account_currency
  from public.accounts
  where id = p_account_id
    and user_id = p_user_id
    and deleted_at is null;

  if v_account_currency is null then
    raise exception 'Conta não encontrada ou acesso não permitido.';
  end if;

  v_total := public.get_invoice_total(p_invoice_id);

  if v_total <= 0 then
    raise exception 'A fatura não possui valor a pagar.';
  end if;

  select id
  into v_pagamento_category_id
  from public.categories
  where user_id = p_user_id
    and deleted_at is null
    and system_category_id = (
      select id
      from public.system_categories
      where name = 'Pagamento de Cartão'
        and is_active = true
    )
  limit 1;

  if v_pagamento_category_id is null then
    raise exception 'Categoria de pagamento de cartão não encontrada para o usuário.';
  end if;

  insert into public.transactions (
    user_id,
    account_id,
    category_id,
    type,
    status,
    amount,
    currency,
    description,
    occurred_at,
    paid_at
  ) values (
    p_user_id,
    p_account_id,
    v_pagamento_category_id,
    'despesa',
    'Pago',
    -v_total,
    v_account_currency,
    'Pagamento de fatura: ' || v_invoice.reference_month::text,
    p_paid_at,
    p_paid_at
  );

  update public.transactions
  set status = 'Pago', paid_at = p_paid_at
  where invoice_id = p_invoice_id
    and user_id = p_user_id
    and deleted_at is null;

  update public.invoices
  set status = 'Paga', paid_at = p_paid_at
  where id = p_invoice_id;
end;
$$;

revoke all on function public.pagar_fatura_por_usuario(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.pagar_fatura_por_usuario(uuid, uuid, uuid, timestamptz)
  to service_role;
