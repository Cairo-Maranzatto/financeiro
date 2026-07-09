"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { CategorySelect } from "@/shared/components/category-select"
import { createBudgetSchema } from "@/features/planning/domain/schemas"
import {
  CurrencyInput,
  INPUT_PLAIN_CLASS,
} from "@/shared/components/currency-input"
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

  const {
    register,
    control,
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
        <CategorySelect
          categories={categories ?? []}
          value={categoryId}
          onChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
          filter={(c) => c.type === "Despesa"}
          mode="parent"
          placeholder="Selecione uma categoria"
        />
        {errors.categoryId && (
          <p className="text-destructive text-xs">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Limite</label>
        <Controller
          control={control}
          name="amountLimit"
          render={({ field }) => (
            <CurrencyInput
              value={Number(field.value) || 0}
              onChange={field.onChange}
              className={INPUT_PLAIN_CLASS}
            />
          )}
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
