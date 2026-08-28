-- Fase 5-B: Categorias essenciais e proteção contra exclusão

-- 1. Adiciona a flag is_essential nas tabelas de catálogo e por usuário
ALTER TABLE public.system_categories
  ADD COLUMN IF NOT EXISTS is_essential boolean NOT NULL DEFAULT false;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_essential boolean NOT NULL DEFAULT false;

-- 2. Marca categorias de catálogo que já são essenciais (internas + usadas pelo sistema)
UPDATE public.system_categories
SET is_essential = true
WHERE is_internal = true
   OR name IN (
     'Outras / Não Categorizado',
     'Pagamento de Cartão'
   );

-- 3. Garante as categorias de empréstimo no catálogo global e as marca como essenciais

-- 3.1. 'Pagamento de Empréstimo' e 'Empréstimo Concedido' (despesa) filhas de 'Finanças & Impostos'
INSERT INTO public.system_categories (name, type, icon, is_internal, sort_order, parent_id, is_essential, is_active)
SELECT
  v.name,
  'Despesa',
  'receipt',
  false,
  v.sort_order,
  p.id,
  true,
  true
FROM (VALUES
  ('Pagamento de Empréstimo', 1406),
  ('Empréstimo Concedido', 1407)
) AS v(name, sort_order)
CROSS JOIN public.system_categories p
WHERE p.name = 'Finanças & Impostos'
  AND p.parent_id IS NULL
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.system_categories sc
    WHERE sc.name = v.name
  );

-- 3.2. 'Recebimento de Empréstimo Concedido' (receita) como categoria-pai
-- Não pode ser filha de 'Finanças & Impostos' porque essa categoria-pai é do tipo 'Despesa'
-- e o sistema exige herança de tipo. Fica como categoria-pai essencial do tipo 'Receita'.
INSERT INTO public.system_categories (name, type, icon, is_internal, sort_order, parent_id, is_essential, is_active)
SELECT
  'Recebimento de Empréstimo Concedido',
  'Receita',
  'receipt',
  false,
  410,
  NULL,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_categories sc
  WHERE sc.name = 'Recebimento de Empréstimo Concedido'
);

-- 4. Atualiza categorias por usuário criadas manualmente na migration 20260828130000
UPDATE public.categories
SET is_essential = true
WHERE name IN (
  'Pagamento de Empréstimo',
  'Empréstimo Concedido',
  'Recebimento de Empréstimo Concedido'
)
  AND deleted_at IS NULL;

-- 5. Sincroniza is_essential das categorias do usuário a partir do catálogo global
UPDATE public.categories c
SET is_essential = true
FROM public.system_categories sc
WHERE c.system_category_id = sc.id
  AND sc.is_essential = true
  AND c.deleted_at IS NULL;

-- 6. Backfill: garante que todos os usuários tenham as categorias essenciais do catálogo
--    (pais e especiais primeiro, depois filhas resolvendo o pai do próprio usuário)
INSERT INTO public.categories (user_id, name, type, system_category_id, icon, is_essential)
SELECT
  u.user_id,
  sc.name,
  sc.type,
  sc.id,
  sc.icon,
  sc.is_essential
FROM (SELECT DISTINCT user_id FROM public.categories) u
CROSS JOIN public.system_categories sc
WHERE sc.is_active = true
  AND sc.parent_id IS NULL
  AND sc.is_essential = true
  AND NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = u.user_id
      AND c.system_category_id = sc.id
      AND c.deleted_at IS NULL
  );

INSERT INTO public.categories (user_id, name, type, system_category_id, parent_category_id, icon, is_essential)
SELECT
  u.user_id,
  sc.name,
  sc.type,
  sc.id,
  c_pai.id,
  sc.icon,
  sc.is_essential
FROM (SELECT DISTINCT user_id FROM public.categories) u
CROSS JOIN public.system_categories sc
JOIN public.categories c_pai
  ON c_pai.user_id = u.user_id AND c_pai.system_category_id = sc.parent_id
WHERE sc.is_active = true
  AND sc.parent_id IS NOT NULL
  AND sc.is_essential = true
  AND NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = u.user_id
      AND c.system_category_id = sc.id
      AND c.deleted_at IS NULL
  );

-- 7. Vincula system_category_id das categorias de empréstimo já criadas
UPDATE public.categories c
SET system_category_id = sc.id
FROM public.system_categories sc
WHERE c.name = sc.name
  AND c.system_category_id IS NULL
  AND sc.is_essential = true
  AND c.deleted_at IS NULL;

-- 8. Atualiza handle_new_user() para copiar is_essential no onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (id) VALUES (new.id);

  -- Passo 1: categorias-pai e especiais
  INSERT INTO public.categories (user_id, name, type, system_category_id, icon, is_essential)
  SELECT new.id, sc.name, sc.type, sc.id, sc.icon, sc.is_essential
  FROM public.system_categories sc
  WHERE sc.is_active AND sc.parent_id IS NULL;

  -- Passo 2: subcategorias resolvendo o pai do próprio usuário
  INSERT INTO public.categories (user_id, name, type, system_category_id, parent_category_id, icon, is_essential)
  SELECT new.id, sc.name, sc.type, sc.id, c_pai.id, sc.icon, sc.is_essential
  FROM public.system_categories sc
  JOIN public.categories c_pai
    ON c_pai.user_id = new.id AND c_pai.system_category_id = sc.parent_id
  WHERE sc.is_active AND sc.parent_id IS NOT NULL;

  RETURN new;
END;
$$;

-- 9. Trigger que impede o soft delete de categorias essenciais
CREATE OR REPLACE FUNCTION public.validate_essential_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND OLD.is_essential = true THEN
    RAISE EXCEPTION 'Categoria essencial não pode ser excluída.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_essential_delete ON public.categories;
CREATE TRIGGER trg_prevent_essential_delete
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.validate_essential_delete();
