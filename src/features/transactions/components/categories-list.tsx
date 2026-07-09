"use client"

import { useState } from "react"

import {
  useCategories,
  useUpdateCategory,
  useDeleteCategory,
} from "@/features/transactions/hooks/use-transactions"
import { CategoryForm } from "@/features/transactions/components/category-form"
import { CategoryIcon } from "@/shared/ui/category-icon"
import type { Category } from "@/features/transactions/api/categories"
import type {
  CategoryType,
  CreateCategoryInput,
} from "@/features/transactions/domain/schemas"

const TYPE_LABELS: Record<CategoryType, string> = {
  Despesa: "Despesa",
  Receita: "Receita",
  Ambas: "Ambas",
}

function CategoryRow({
  category,
  parentOptions,
  childCount,
  indent,
}: {
  category: Category
  parentOptions: Category[]
  childCount?: number
  indent?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: update, isPending: isUpdating } = useUpdateCategory()
  const { mutate: remove, isPending: isDeleting } = useDeleteCategory()

  function handleUpdate(values: CreateCategoryInput) {
    update(
      { id: category.id, name: values.name, type: values.type },
      { onSuccess: () => setEditing(false) }
    )
  }

  function handleDelete() {
    remove(category.id, { onSuccess: () => setConfirmDelete(false) })
  }

  if (editing) {
    return (
      <li
        className={`bg-muted/30 rounded-lg border p-3 ${indent ? "ml-6" : ""}`}
      >
        <CategoryForm
          initial={category}
          parentOptions={parentOptions}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isPending={isUpdating}
        />
      </li>
    )
  }

  const hasChildren = (childCount ?? 0) > 0

  return (
    <li
      className={`bg-card flex items-center justify-between rounded-lg border px-4 py-3 ${indent ? "ml-6" : ""}`}
    >
      <div className="flex items-center gap-3">
        {!indent && (
          <CategoryIcon
            icon={category.icon}
            className="text-muted-foreground size-4"
          />
        )}
        <span className="text-sm font-medium">{category.name}</span>
        {category.is_internal && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            sistema
          </span>
        )}
        {!category.is_internal &&
          category.type === "Ambas" &&
          !category.parent_category_id && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              especial
            </span>
          )}
      </div>

      {category.is_internal ? null : confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Confirmar exclusão?
          </span>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
          >
            {isDeleting ? "Excluindo…" : "Sim"}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md border px-3 py-1 text-xs font-medium"
          >
            Não
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="hover:bg-muted rounded-md px-3 py-1 text-xs font-medium"
          >
            Editar
          </button>
          {hasChildren ? (
            <span
              title="Exclua ou mova as subcategorias primeiro"
              className="text-muted-foreground cursor-not-allowed rounded-md px-3 py-1 text-xs font-medium"
            >
              Excluir
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:bg-destructive/10 rounded-md px-3 py-1 text-xs font-medium"
            >
              Excluir
            </button>
          )}
        </div>
      )}
    </li>
  )
}

const GROUP_ORDER: CategoryType[] = ["Despesa", "Receita"]

export function CategoriesList() {
  const { data: categories, isLoading, error } = useCategories()

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  if (error)
    return (
      <p className="text-destructive text-sm">Erro ao carregar categorias.</p>
    )
  if (!categories?.length)
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma categoria encontrada.
      </p>
    )

  const parentOptions = categories.filter(
    (c) => !c.parent_category_id && c.type !== "Ambas"
  )
  const specials = categories.filter(
    (c) => !c.parent_category_id && c.type === "Ambas"
  )
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_category_id === parentId)

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    parents: parentOptions.filter((c) => c.type === type),
  })).filter((g) => g.parents.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(({ type, parents }) => (
        <div key={type}>
          <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
            {TYPE_LABELS[type]} ({parents.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {parents.map((parent) => {
              const children = childrenOf(parent.id)
              return (
                <li key={parent.id} className="flex flex-col gap-2">
                  <ul>
                    <CategoryRow
                      category={parent}
                      parentOptions={parentOptions}
                      childCount={children.length}
                    />
                  </ul>
                  {children.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {children.map((child) => (
                        <CategoryRow
                          key={child.id}
                          category={child}
                          parentOptions={parentOptions}
                          indent
                        />
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {specials.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
            Especiais ({specials.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {specials.map((special) => (
              <CategoryRow
                key={special.id}
                category={special}
                parentOptions={parentOptions}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
