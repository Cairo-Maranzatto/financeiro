import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/shared/supabase/database.types"
import { softDelete } from "@/shared/supabase/soft-delete"
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/features/transactions/domain/schemas"

export type Category = Database["public"]["Tables"]["categories"]["Row"] & {
  is_internal: boolean
}

export async function fetchCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("categories")
    .select("*, system_categories(is_internal)")
    .order("name", { ascending: true })

  if (error) throw error
  return data.map(({ system_categories, ...category }) => ({
    ...category,
    is_internal: system_categories?.is_internal ?? false,
  }))
}

export async function createCategory(
  supabase: SupabaseClient<Database>,
  input: CreateCategoryInput
) {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      type: input.type,
      parent_category_id: input.parentCategoryId ?? null,
      icon: input.parentCategoryId ? null : (input.icon ?? null),
    })
    .select("id")
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  supabase: SupabaseClient<Database>,
  input: UpdateCategoryInput
) {
  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      type: input.type,
      icon: input.parentCategoryId ? null : (input.icon ?? null),
    })
    .eq("id", input.id)

  if (error) throw error
}

export async function deleteCategory(
  supabase: SupabaseClient<Database>,
  id: string
) {
  const { error } = await softDelete(supabase, "categories", id)
  if (error) throw error
}
