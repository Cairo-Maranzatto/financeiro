"use client"

import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { CategorySelect } from "@/shared/components/category-select"
import { createRecurrenceSchema } from "@/features/planning/domain/schemas"
import { useCreateRecurrenceRule } from "@/features/planning/hooks/use-planning"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"
import { useCategories } from "@/features/transactions/hooks/use-transactions"
import type { Currency } from "@/features/accounts/domain/schemas"
import {
  CurrencyInput,
  INPUT_PLAIN_CLASS,
} from "@/shared/components/currency-input"

type FormValues = z.input<typeof createRecurrenceSchema>
type FormOutput = z.output<typeof createRecurrenceSchema>

const todayStr = new Date().toISOString().slice(0, 10)

export function RecurrenceForm({ onSuccess }: { onSuccess?: () => void }) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const { mutate: create, isPending, error } = useCreateRecurrenceRule()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createRecurrenceSchema),
    defaultValues: {
      type: "despesa",
      currency: "BRL",
      frequency: "mensal",
      nextOccurrenceDate: todayStr,
    },
  })

  const accountId = watch("accountId")
  const type = watch("type")

  // Auto-fill currency from selected account
  useEffect(() => {
    const acc = accounts?.find((a) => a.id === accountId)
    if (acc)
      setValue("currency", acc.currency as Currency, { shouldValidate: true })
  }, [accountId, accounts, setValue])

  const typeLabel = type === "despesa" ? "Despesa" : "Receita"

  function onSubmit(values: FormOutput) {
    create(values, {
      onSuccess: () => {
        reset({
          type: "despesa",
          currency: "BRL",
          frequency: "mensal",
          nextOccurrenceDate: todayStr,
        })
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Conta */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Conta</label>
        <Controller
          control={control}
          name="accountId"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma conta">
                  {accounts?.find((a) => a.id === field.value)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.accountId && (
          <p className="text-destructive text-xs">{errors.accountId.message}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Tipo</label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === "receita" ? "Receita" : "Despesa"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Categoria */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Categoria</label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <CategorySelect
              categories={categories ?? []}
              value={field.value}
              onChange={field.onChange}
              filter={(c) =>
                !c.is_internal && (c.type === typeLabel || c.type === "Ambas")
              }
              placeholder="Selecione uma categoria"
            />
          )}
        />
        {errors.categoryId && (
          <p className="text-destructive text-xs">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      {/* Valor + Frequência */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Valor</label>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <CurrencyInput
                value={Number(field.value) || 0}
                onChange={field.onChange}
                className={INPUT_PLAIN_CLASS}
              />
            )}
          />
          {errors.amount && (
            <p className="text-destructive text-xs">{errors.amount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Frequência</label>
          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {
                      {
                        diaria: "Diária",
                        semanal: "Semanal",
                        mensal: "Mensal",
                        anual: "Anual",
                      }[field.value]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Descrição (opcional)</label>
        <input
          {...register("description")}
          type="text"
          placeholder="ex: Aluguel, Netflix…"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Primeira ocorrência</label>
          <input
            {...register("nextOccurrenceDate")}
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
          />
          {errors.nextOccurrenceDate && (
            <p className="text-destructive text-xs">
              {errors.nextOccurrenceDate.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Data fim (opcional)</label>
          <input
            {...register("endDate")}
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error
            ? error.message
            : "Erro ao criar recorrência."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Criar recorrência"}
      </button>
    </form>
  )
}
