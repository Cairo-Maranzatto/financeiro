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
  initial?: Pick<Category, "id" | "name" | "type">
  onSubmit: (values: CreateCategoryInput) => void
  onCancel?: () => void
  isPending?: boolean
}

export function CategoryForm({
  initial,
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
    },
  })

  useEffect(() => {
    if (initial) {
      reset({ name: initial.name, type: initial.type as CategoryType })
    }
  }, [initial, reset])

  const typeValue = useWatch({ control, name: "type" })

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
        <label className="text-sm font-medium">Tipo</label>
        <Select
          value={typeValue}
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
        {errors.type && (
          <p className="text-destructive text-xs">{errors.type.message}</p>
        )}
      </div>

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
