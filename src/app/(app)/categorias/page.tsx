"use client"

import { useState } from "react"

import { CategoryForm } from "@/features/transactions/components/category-form"
import { CategoriesList } from "@/features/transactions/components/categories-list"
import {
  useCategories,
  useCreateCategory,
} from "@/features/transactions/hooks/use-transactions"
import type { CreateCategoryInput } from "@/features/transactions/domain/schemas"

export default function CategoriasPage() {
  const [showForm, setShowForm] = useState(false)
  const { mutate: create, isPending } = useCreateCategory()
  const { data: categories } = useCategories()
  const parentOptions = (categories ?? []).filter(
    (c) => !c.parent_category_id && c.type !== "Ambas"
  )

  function handleCreate(values: CreateCategoryInput) {
    create(values, {
      onSuccess: () => {
        setShowForm(false)
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            + Nova categoria
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card mb-6 rounded-lg border p-4">
          <h2 className="mb-4 text-sm font-semibold">Nova categoria</h2>
          <CategoryForm
            parentOptions={parentOptions}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isPending={isPending}
          />
        </div>
      )}

      <CategoriesList />
    </div>
  )
}
