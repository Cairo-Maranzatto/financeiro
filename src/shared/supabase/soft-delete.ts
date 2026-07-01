import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Exclusão lógica obrigatória (RNF06 / AGENTS.md) — nunca usar `.delete()` do
 * Supabase em tabela de domínio. Esta função é o único caminho suportado.
 */
export function softDelete(
  supabase: SupabaseClient,
  table: string,
  id: string
) {
  return supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
}
