-- =========================================================================
-- Fase 0 — Fundação Técnica & Arquitetura Base
-- Ver AGENTS.md e PLANEJAMENTO_SISTEMA_FINANCEIRO.md (Seções 25, 28, RNF05).
-- =========================================================================

-- Supabase já instala pgcrypto no schema `extensions` por padrão em projetos novos
-- (não em `public`) — explicitado aqui para que `extensions.gen_random_bytes()` abaixo
-- sempre resolva, independente do search_path da sessão que chama a função.
create extension if not exists pgcrypto with schema extensions;

-- -------------------------------------------------------------------------
-- 1. UUIDv7 (decisão fechada — Seção 25/RNF05): ordenação temporal nativa,
--    melhor localidade de índice B-tree que UUIDv4. Implementação PL/pgSQL
--    portátil (não depende de extensão externa como pg_uuidv7).
-- -------------------------------------------------------------------------
create or replace function public.uuid_generate_v7()
returns uuid
language plpgsql
volatile
as $$
declare
  v_time double precision;
  v_timestamp bigint;
  v_timestamp_hex varchar;
  v_random bytea;
  v_bytes bytea;
begin
  v_time := extract(epoch from clock_timestamp());
  v_timestamp := trunc(v_time * 1000)::bigint;
  v_timestamp_hex := lpad(to_hex(v_timestamp), 12, '0');

  v_random := extensions.gen_random_bytes(10);
  v_bytes := decode(v_timestamp_hex, 'hex') || v_random;

  -- versão 7 nos 4 bits altos do byte 6 (0-indexed)
  v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & 15) | 112);
  -- variante RFC4122 (10xx) nos 2 bits altos do byte 8
  v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & 63) | 128);

  return encode(v_bytes, 'hex')::uuid;
end;
$$;

comment on function public.uuid_generate_v7() is
  'Gera UUIDv7 (ordenável por tempo). Default de id em toda tabela de domínio a partir da Fase 1 — decisão fechada na Seção 25 do planejamento macro.';

-- -------------------------------------------------------------------------
-- 2. Funções genéricas de auditoria (RNF05 / Seção 16)
-- -------------------------------------------------------------------------

-- Aplicada em toda tabela de domínio com user_id/created_by/updated_by/
-- deleted_at/deleted_by (a partir da Fase 1). NÃO usar em user_settings ou
-- system_categories (não seguem esse padrão de colunas).
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, auth.uid());
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
    new.updated_at := now();
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

comment on function public.set_audit_fields() is
  'Trigger BEFORE INSERT OR UPDATE para tabelas de domínio (user_id + colunas de auditoria). Popula created_by/updated_by via auth.uid(), protege created_at/created_by contra alteração e popula deleted_by automaticamente quando deleted_at é setado. RNF05.';

-- Apenas bump de updated_at, para tabelas fora do padrão de auditoria completo (ex: user_settings).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. user_settings — 1:1 com auth.users (Seção 28)
-- -------------------------------------------------------------------------
create table public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  financial_month_start_day int not null default 1 check (financial_month_start_day between 1 and 28),
  plan_id text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is
  'Preferências do usuário (Seção 28). NÃO estende auth.users diretamente — FK 1:1 via id.';
comment on column public.user_settings.financial_month_start_day is
  'Dia de início do mês financeiro (1-28, evita ambiguidade em meses curtos). Usado por resolveFinancialMonth() a partir da Fase 3/4 — Seção 29.';

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = id);

create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = id);

-- Sem policy de insert: a linha só é criada pelo trigger de onboarding (security definer),
-- nunca diretamente pelo usuário via API.

create trigger trg_user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------------
-- 4. system_categories — catálogo global, somente leitura para o app (Seção 28/23)
-- -------------------------------------------------------------------------
create table public.system_categories (
  id uuid primary key default public.uuid_generate_v7(),
  name text not null,
  type text not null check (type in ('Receita', 'Despesa', 'Ambas')),
  icon text,
  is_internal boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.system_categories is
  'Catálogo global de categorias padrão, copiado para a tabela categories de cada usuário no onboarding (Fase 1). Nunca exposto para escrita via API — apenas seed via migration.';
comment on column public.system_categories.is_internal is
  'Categorias de sistema não selecionáveis pelo usuário em formulários (ex: "Saldo Inicial", usada internamente pela Fase 1) — Seção 14/29.';

alter table public.system_categories enable row level security;

create policy "system_categories_select_authenticated" on public.system_categories
  for select using (auth.role() = 'authenticated');

-- Sem policy de insert/update/delete: catálogo é imutável via API (apenas migrations/service_role).

insert into public.system_categories (name, type, icon, is_internal, sort_order) values
  ('Salário', 'Receita', 'banknote', false, 1),
  ('Investimentos', 'Receita', 'trending-up', false, 2),
  ('Outras Receitas', 'Receita', 'plus-circle', false, 3),
  ('Alimentação', 'Despesa', 'utensils', false, 10),
  ('Moradia', 'Despesa', 'home', false, 11),
  ('Transporte', 'Despesa', 'car', false, 12),
  ('Saúde', 'Despesa', 'heart-pulse', false, 13),
  ('Educação', 'Despesa', 'graduation-cap', false, 14),
  ('Lazer', 'Despesa', 'gamepad-2', false, 15),
  ('Compras', 'Despesa', 'shopping-bag', false, 16),
  ('Assinaturas', 'Despesa', 'repeat', false, 17),
  ('Pagamento de Cartão', 'Despesa', 'credit-card', false, 18),
  ('Outras Despesas', 'Ambas', 'circle-ellipsis', false, 99),
  ('Saldo Inicial', 'Ambas', 'flag', true, 999);

-- -------------------------------------------------------------------------
-- 5. Onboarding — popula user_settings ao criar um novo usuário (Seção 22/28)
--    NOTA: a cópia de system_categories para a tabela `categories` do usuário
--    é adicionada na migration da Fase 1 (quando a tabela `categories` passa
--    a existir) — ver MEMORY_BANK.md, entrada da Fase 0, para o motivo do split.
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (id) values (new.id);
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
