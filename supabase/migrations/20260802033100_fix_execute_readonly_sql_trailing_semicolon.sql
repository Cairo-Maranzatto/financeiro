-- Fase LLM 5 -- Corrige execute_readonly_sql para aceitar queries com ponto e vírgula no final
CREATE OR REPLACE FUNCTION public.execute_readonly_sql(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  normalized_query TEXT;
  clean_query TEXT;
BEGIN
  -- Remove ponto e vírgula e espaços do final da query
  clean_query := btrim(regexp_replace(p_query, '\s*;\s*$', ''));
  normalized_query := lower(regexp_replace(clean_query, '\s+', ' ', 'g'));

  IF normalized_query ~ '(\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\balter\b|\bgrant\b|\brevoke\b|\btruncate\b|\bcreate\b|\bcall\b)' THEN
    RAISE EXCEPTION 'Apenas comandos SELECT são permitidos.';
  END IF;

  IF NOT (normalized_query ~ '^select\s') THEN
    RAISE EXCEPTION 'A query deve iniciar com SELECT.';
  END IF;

  EXECUTE 'SELECT jsonb_agg(t) FROM (' || clean_query || ') t' INTO result;

  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;
