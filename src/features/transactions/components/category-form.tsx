"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { CategoryIcon, CATEGORY_ICON_NAMES } from "@/shared/ui/category-icon"
import {
  createCategorySchema,
  type CreateCategoryInput,
  type CategoryType,
} from "@/features/transactions/domain/schemas"
import type { Category } from "@/features/transactions/api/categories"

const TYPE_LABELS: Record<CategoryType, string> = {
  Despesa: "Despesa",
  Receita: "Receita",
  Ambas: "Ambas",
}

interface Props {
  initial?: Pick<
    Category,
    "id" | "name" | "type" | "icon" | "parent_category_id" | "is_internal"
  >
  /** Categorias-pai disponíveis (parent_category_id null e type !== "Ambas") */
  parentOptions: Pick<Category, "id" | "name" | "type" | "icon">[]
  onSubmit: (values: CreateCategoryInput) => void
  onCancel?: () => void
  isPending?: boolean
}

export function CategoryForm({
  initial,
  parentOptions,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: initial?.name ?? "",
      type: (initial?.type as CategoryType) ?? "Despesa",
      parentCategoryId: initial?.parent_category_id ?? undefined,
      icon: initial?.icon ?? undefined,
    },
  })

  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name,
        type: initial.type as CategoryType,
        parentCategoryId: initial.parent_category_id ?? undefined,
        icon: initial.icon ?? undefined,
      })
    }
  }, [initial, reset])

  const typeValue = useWatch({ control, name: "type" })
  const parentCategoryId = useWatch({ control, name: "parentCategoryId" })
  const iconValue = useWatch({ control, name: "icon" })
  const selectedParent = parentOptions.find((p) => p.id === parentCategoryId)

  if (initial?.is_internal) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
        <span className="font-medium">{initial.name}</span> é uma categoria
        interna do sistema e não pode ser editada.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nome</label>
        <input
          {...register("name")}
          type="text"
          placeholder="ex: Alimentação, Salário…"
          className="rounded-md border px-3 py-2 text-sm"
          autoFocus
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Categoria-pai</label>
        <Select
          value={parentCategoryId ?? "__none__"}
          onValueChange={(v) => {
            if (v === null) return
            const next = v === "__none__" ? undefined : v
            setValue("parentCategoryId", next, { shouldValidate: true })
            const parent = parentOptions.find((p) => p.id === next)
            if (parent) {
              setValue("type", parent.type as CategoryType, {
                shouldValidate: true,
              })
              setValue("icon", undefined)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {selectedParent
                ? selectedParent.name
                : "Nenhuma (nova categoria-pai)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              Nenhuma (nova categoria-pai)
            </SelectItem>
            {parentOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Selecione uma categoria-pai para criar uma subcategoria dentro dela,
          ou deixe em branco para criar uma nova categoria-pai.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Tipo</label>
        <Select
          value={typeValue}
          disabled={!!parentCategoryId}
          onValueChange={(v) => {
            if (v !== null)
              setValue("type", v as CategoryType, { shouldValidate: true })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{TYPE_LABELS[typeValue]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Despesa">Despesa</SelectItem>
            <SelectItem value="Receita">Receita</SelectItem>
            <SelectItem value="Ambas">Ambas</SelectItem>
          </SelectContent>
        </Select>
        {parentCategoryId && (
          <p className="text-muted-foreground text-xs">
            Herdado da categoria-pai selecionada.
          </p>
        )}
        {errors.type && (
          <p className="text-destructive text-xs">{errors.type.message}</p>
        )}
      </div>

      {!parentCategoryId && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setValue("icon", name, { shouldValidate: true })}
                className={`rounded-md border p-2 ${
                  iconValue === name
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
                aria-label={name}
              >
                <CategoryIcon icon={name} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending
            ? "Salvando…"
            : initial
              ? "Salvar alterações"
              : "Criar categoria"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
