-- =========================================================================
-- Backfill único: usuários criados antes da migration da Fase 1
-- (20260630181532) fizeram onboarding com a versão antiga de
-- handle_new_user(), que só populava user_settings — sem a tabela
-- `categories` ainda existir não havia o que copiar. Copia agora
-- system_categories -> categories para todo usuário que ainda está
-- com zero categorias.
-- =========================================================================

insert into public.categories (user_id, name, type, system_category_id, icon)
select u.id, sc.name, sc.type, sc.id, sc.icon
from auth.users u
cross join public.system_categories sc
where not exists (
  select 1 from public.categories c where c.user_id = u.id
);
