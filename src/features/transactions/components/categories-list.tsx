"use client"

import { useState } from "react"

import {
  useCategories,
  useUpdateCategory,
  useDeleteCategory,
} from "@/features/transactions/hooks/use-transactions"
import { CategoryForm } from "@/features/transactions/components/category-form"
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

const TYPE_COLORS: Record<CategoryType, string> = {
  Despesa: "bg-red-100 text-red-700",
  Receita: "bg-green-100 text-green-700",
  Ambas: "bg-blue-100 text-blue-700",
}

function CategoryRow({ category }: { category: Category }) {
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
      <li className="bg-muted/30 rounded-lg border p-3">
        <CategoryForm
          initial={category}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          isPending={isUpdating}
        />
      </li>
    )
  }

  return (
    <li className="bg-card flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{category.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[category.type as CategoryType]}`}
        >
          {TYPE_LABELS[category.type as CategoryType]}
        </span>
      </div>

      {confirmDelete ? (
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
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:bg-destructive/10 rounded-md px-3 py-1 text-xs font-medium"
          >
            Excluir
          </button>
        </div>
      )}
    </li>
  )
}

const GROUP_ORDER: CategoryType[] = ["Despesa", "Receita", "Ambas"]

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

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: categories.filter((c) => c.type === type),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(({ type, items }) => (
        <div key={type}>
          <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
            {TYPE_LABELS[type]} ({items.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {items.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
