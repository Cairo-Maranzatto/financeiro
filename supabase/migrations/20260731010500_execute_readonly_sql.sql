-- Fase LLM 5 — RAG Analítico Restrito (Text-to-SQL)
-- Cria uma RPC segura para executar queries SELECT dinâmicas honrando RLS.

CREATE OR REPLACE FUNCTION public.execute_readonly_sql(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized_query TEXT;
BEGIN
  -- Normaliza para validação insensível a caixa e remove espaços exagerados
  normalized_query := lower(regexp_replace(p_query, '\s+', ' ', 'g'));

  -- Bloqueia comandos perigosos
  IF normalized_query ~ '(\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\balter\b|\bgrant\b|\brevoke\b|\btruncate\b|\bcreate\b|\bcall\b)' THEN
    RAISE EXCEPTION 'Apenas comandos SELECT são permitidos.';
  END IF;

  -- Garante que a query começa com SELECT (proteção grossa adicional)
  IF NOT (normalized_query ~ '^select\s') THEN
    RAISE EXCEPTION 'A query deve iniciar com SELECT.';
  END IF;

  EXECUTE 'SELECT jsonb_agg(t) FROM (' || p_query || ') t' INTO result;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;

COMMENT ON FUNCTION public.execute_readonly_sql(TEXT) IS
  'Executa queries SELECT fornecidas pelo usuário respeitando RLS (SECURITY INVOKER). Usada apenas pela tool de RAG do assistente.';

GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(TEXT) TO authenticated;
