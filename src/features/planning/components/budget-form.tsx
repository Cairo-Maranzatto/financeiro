"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { createBudgetSchema } from "@/features/planning/domain/schemas"
import { useCreateBudget } from "@/features/planning/hooks/use-planning"
import { useCategories } from "@/features/transactions/hooks/use-transactions"
import { useUserSettings } from "@/features/identity/hooks/use-user-settings"
import {
  resolveFinancialMonth,
  toDateString,
} from "@/shared/domain/financial-month"
import { toDateInTimezone } from "@/shared/lib/timezone"

type FormValues = z.input<typeof createBudgetSchema>
type FormOutput = z.output<typeof createBudgetSchema>

export function BudgetForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: settings } = useUserSettings()
  const { data: categories } = useCategories()
  const { mutate: createBudget, isPending, error } = useCreateBudget()

  const currentReferenceMonth = (() => {
    if (!settings) return ""
    const nowLocal = toDateInTimezone(new Date(), settings.timezone)
    return toDateString(
      resolveFinancialMonth(nowLocal, settings.financial_month_start_day).start
    )
  })()

  const expenseCategories =
    categories?.filter((c) => c.type === "Despesa" || c.type === "Ambas") ?? []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: { referenceMonth: currentReferenceMonth },
  })

  const categoryId = watch("categoryId")

  function onSubmit(values: FormOutput) {
    createBudget(values, {
      onSuccess: () => {
        reset({ referenceMonth: currentReferenceMonth })
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Categoria</label>
        <Select
          value={categoryId ?? ""}
          onValueChange={(v) => {
            if (v !== null) setValue("categoryId", v, { shouldValidate: true })
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma categoria">
              {expenseCategories.find((c) => c.id === categoryId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-destructive text-xs">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Limite (R$)</label>
        <input
          {...register("amountLimit")}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          className="rounded-md border px-3 py-2 text-sm"
        />
        {errors.amountLimit && (
          <p className="text-destructive text-xs">
            {errors.amountLimit.message}
          </p>
        )}
      </div>

      <input type="hidden" {...register("referenceMonth")} />

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error ? error.message : "Erro ao criar orçamento."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !currentReferenceMonth}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Criar orçamento"}
      </button>
    </form>
  )
}
