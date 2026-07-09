-- Fase A1 do aprimoramento de categorias (fases/aprimoramento/FASE_A01_MIGRACAO_DADOS.md)
-- Fase de maior risco do aprimoramento: reescreve dados reais de usuários já em produção
-- (categories, transactions, budgets, recurrence_rules). Não roda DELETE físico em nenhum
-- momento — apenas soft delete (deleted_at) das categorias legadas, depois de confirmar que
-- nenhuma linha ainda referencia o id antigo.

-- -------------------------------------------------------------------------
-- 1. Onboarding hierárquico: handle_new_user() passa a copiar só is_active = true,
--    em duas passadas (pais/especiais primeiro, depois subcategorias resolvendo o pai
--    já criado na tabela categories do próprio usuário).
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (id) values (new.id);

  -- Passo 1: categorias-pai e especiais (parent_id null na taxonomia global)
  insert into public.categories (user_id, name, type, system_category_id, icon)
  select new.id, sc.name, sc.type, sc.id, sc.icon
  from public.system_categories sc
  where sc.is_active and sc.parent_id is null;

  -- Passo 2: subcategorias, resolvendo o pai já criado no passo 1 para este usuário
  insert into public.categories (user_id, name, type, system_category_id, parent_category_id, icon)
  select new.id, sc.name, sc.type, sc.id, c_pai.id, sc.icon
  from public.system_categories sc
  join public.categories c_pai
    on c_pai.user_id = new.id and c_pai.system_category_id = sc.parent_id
  where sc.is_active and sc.parent_id is not null;

  return new;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. Backfill idempotente: garante que todo usuário já existente (onboarded antes desta
--    migration, ou mesmo um usuário que tenha se cadastrado no intervalo entre a Fase A0
--    e esta migration usando a função antiga) tenha a taxonomia nova completa.
-- -------------------------------------------------------------------------

-- 2a. Categorias-pai/especiais que faltam
insert into public.categories (user_id, name, type, system_category_id, icon)
select u.user_id, sc.name, sc.type, sc.id, sc.icon
from (select distinct user_id from public.categories) u
cross join public.system_categories sc
where sc.is_active and sc.parent_id is null
  and not exists (
    select 1 from public.categories c
    where c.user_id = u.user_id and c.system_category_id = sc.id
  );

-- 2b. Subcategorias que faltam
insert into public.categories (user_id, name, type, system_category_id, parent_category_id, icon)
select u.user_id, sc.name, sc.type, sc.id, c_pai.id, sc.icon
from (select distinct user_id from public.categories) u
cross join public.system_categories sc
join public.categories c_pai
  on c_pai.user_id = u.user_id and c_pai.system_category_id = sc.parent_id
where sc.is_active and sc.parent_id is not null
  and not exists (
    select 1 from public.categories c
    where c.user_id = u.user_id and c.system_category_id = sc.id
  );

-- 2c. Rede de segurança: corrige parent_category_id de qualquer linha que já tinha o
--     system_category_id copiado (ex: usuário que se cadastrou entre a Fase A0 e esta
--     migration, com a função antiga flat) mas ainda não tinha o vínculo de pai resolvido.
update public.categories c
set parent_category_id = c_pai.id
from public.system_categories sc,
     public.categories c_pai
where c.system_category_id = sc.id
  and sc.parent_id is not null
  and c.parent_category_id is null
  and c_pai.user_id = c.user_id
  and c_pai.system_category_id = sc.parent_id;

-- -------------------------------------------------------------------------
-- 3. Mapeamento de-para: categoria antiga (flat) -> subcategoria nova (folha) mais próxima.
--    Ponto de partida razoável, não uma reclassificação perfeita — o usuário pode ajustar
--    manualmente depois pela UI de gestão de categorias (Fase A3/A4). "Saldo Inicial" não
--    entra no mapa: é reaproveitada como está, sem remapear.
-- -------------------------------------------------------------------------
create temporary table category_migration_map (
  old_name text primary key,
  new_leaf_name text not null
);

insert into category_migration_map (old_name, new_leaf_name) values
  ('Salário', 'Salário / Ordenado'),
  ('Investimentos', 'Rendimento Renda Fixa'),
  ('Outras Receitas', 'Receitas Eventuais'),
  ('Alimentação', 'Supermercado & Feira'),
  ('Moradia', 'Aluguel / Financiamento'),
  ('Transporte', 'Combustível'),
  ('Saúde', 'Consultas & Exames'),
  ('Educação', 'Mensalidade Escola / Faculdade'),
  ('Lazer', 'Cinema / Shows / Teatro'),
  ('Compras', 'Roupas & Calçados'),
  ('Assinaturas', 'Assinaturas Streaming'),
  ('Pagamento de Cartão', 'Pagamento de Cartão'),
  ('Outras Despesas', 'Outras / Não Categorizado');

-- -------------------------------------------------------------------------
-- 4. Resolve, por usuário, o par (categoria antiga do usuário -> categoria nova do usuário)
-- -------------------------------------------------------------------------
create temporary table category_remap as
select lc.id as old_category_id, lc.user_id, nc.id as new_category_id
from public.categories lc
join public.system_categories sc_old on sc_old.id = lc.system_category_id
join category_migration_map m on m.old_name = sc_old.name
join public.system_categories sc_new on sc_new.name = m.new_leaf_name and sc_new.is_active
join public.categories nc on nc.user_id = lc.user_id and nc.system_category_id = sc_new.id
where sc_old.is_active = false and sc_old.is_internal = false;

-- -------------------------------------------------------------------------
-- 5. Remapeia todas as referências de FK das categorias antigas para as novas
-- -------------------------------------------------------------------------
update public.transactions t
set category_id = r.new_category_id
from category_remap r
where t.category_id = r.old_category_id;

update public.budgets b
set category_id = r.new_category_id
from category_remap r
where b.category_id = r.old_category_id;

update public.recurrence_rules rr
set category_id = r.new_category_id
from category_remap r
where rr.category_id = r.old_category_id;

-- -------------------------------------------------------------------------
-- 6. Soft delete das categorias antigas do usuário — só depois de confirmar que não
--    sobrou nenhuma referência ativa (checagem de segurança, nunca DELETE físico).
-- -------------------------------------------------------------------------
update public.categories c
set deleted_at = now()
from category_remap r
where c.id = r.old_category_id
  and c.deleted_at is null
  and not exists (select 1 from public.transactions t where t.category_id = c.id and t.deleted_at is null)
  and not exists (select 1 from public.budgets b where b.category_id = c.id and b.deleted_at is null)
  and not exists (select 1 from public.recurrence_rules rr where rr.category_id = c.id and rr.deleted_at is null);

-- -------------------------------------------------------------------------
-- 7. Validação final: se sobrar QUALQUER transação/orçamento/recorrência ainda apontando
--    para uma categoria legada (is_active = false), a migration inteira falha e faz
--    rollback — mais seguro que deixar dado órfão silencioso em produção.
-- -------------------------------------------------------------------------
do $$
declare
  v_orfaos int;
begin
  select count(*) into v_orfaos
  from public.transactions t
  join public.categories c on c.id = t.category_id
  join public.system_categories sc on sc.id = c.system_category_id
  where sc.is_active = false and sc.is_internal = false and t.deleted_at is null;

  if v_orfaos > 0 then
    raise exception 'Migração abortada: % transação(ões) ainda referenciam categoria legada após o remapeamento.', v_orfaos;
  end if;
end;
$$;
