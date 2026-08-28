-- Verifica e sanitiza categorias duplicadas por usuário/nome
--
-- Como usar:
-- 1. Cole este arquivo no SQL Editor do Supabase.
-- 2. A query no topo (até o comentário -- SANITIZAÇÃO) mostra as duplicatas atuais.
-- 3. Para executar a sanitização, remova os comentários do bloco `DO $$` ou rode o arquivo inteiro.
--    Ele mantém uma cópia (a vinculada ao catálogo e mais recente) e faz o soft delete das demais,
--    migrando referências de transactions, recurrence_rules e budgets.

-- -------------------------------------------------------------------------
-- 1. VERIFICAÇÃO: lista categorias duplicadas por usuário
-- -------------------------------------------------------------------------
WITH duplicatas AS (
  SELECT
    c.user_id,
    u.email,
    c.name,
    COUNT(*) AS qtd,
    array_agg(
      jsonb_build_object(
        'id', c.id,
        'created_at', c.created_at,
        'system_category_id', c.system_category_id,
        'is_essential', c.is_essential,
        'parent_category_id', c.parent_category_id
      )
      ORDER BY c.created_at
    ) AS ocorrencias
  FROM public.categories c
  JOIN auth.users u ON u.id = c.user_id
  WHERE c.deleted_at IS NULL
  GROUP BY c.user_id, u.email, c.name
  HAVING COUNT(*) > 1
)
SELECT *
FROM duplicatas
ORDER BY user_id, name;

-- -------------------------------------------------------------------------
-- 2. SANITIZAÇÃO: remove duplicatas e reassocia referências
-- -------------------------------------------------------------------------
-- Descomente o bloco abaixo quando quiser executar a limpeza.

/*
DO $$
DECLARE
  dup RECORD;
  r RECORD;
BEGIN
  FOR dup IN
    SELECT
      c.user_id,
      c.name,
      (
        SELECT k.id
        FROM public.categories k
        WHERE k.user_id = c.user_id
          AND k.name = c.name
          AND k.deleted_at IS NULL
        ORDER BY
          (k.system_category_id IS NOT NULL) DESC,
          k.created_at DESC
        LIMIT 1
      ) AS keep_id
    FROM public.categories c
    WHERE c.deleted_at IS NULL
    GROUP BY c.user_id, c.name
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Processando duplicatas: usuario=%, categoria=%, manter=%',
      dup.user_id, dup.name, dup.keep_id;

    FOR r IN
      SELECT c.id
      FROM public.categories c
      WHERE c.user_id = dup.user_id
        AND c.name = dup.name
        AND c.deleted_at IS NULL
        AND c.id != dup.keep_id
    LOOP
      RAISE NOTICE '  -> removendo %', r.id;

      -- Reassocia transações, recorrências e orçamentos
      UPDATE public.transactions
      SET category_id = dup.keep_id
      WHERE category_id = r.id
        AND deleted_at IS NULL;

      UPDATE public.recurrence_rules
      SET category_id = dup.keep_id
      WHERE category_id = r.id
        AND deleted_at IS NULL;

      UPDATE public.budgets
      SET category_id = dup.keep_id
      WHERE category_id = r.id
        AND deleted_at IS NULL;

      -- Tira a flag essencial e faz o soft delete da cópia duplicada
      UPDATE public.categories
      SET is_essential = false
      WHERE id = r.id;

      UPDATE public.categories
      SET deleted_at = now()
      WHERE id = r.id;
    END LOOP;
  END LOOP;
END $$;
*/
