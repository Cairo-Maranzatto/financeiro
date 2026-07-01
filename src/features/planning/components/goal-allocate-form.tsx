"use client"

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
import { allocateToGoalSchema } from "@/features/planning/domain/schemas"
import { useAllocateToGoal } from "@/features/planning/hooks/use-goals"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"

type FormValues = z.input<typeof allocateToGoalSchema>
type FormOutput = z.output<typeof allocateToGoalSchema>

export function GoalAllocateForm({
  goalId,
  onSuccess,
}: {
  goalId: string
  onSuccess?: () => void
}) {
  const { data: accounts } = useAccounts()
  const { mutate: allocate, isPending, error } = useAllocateToGoal()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(allocateToGoalSchema),
    defaultValues: { goalId },
  })

  function onSubmit(values: FormOutput) {
    allocate(values, {
      onSuccess: () => {
        reset({ goalId })
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Valor do aporte</label>
        <input
          {...register("amount")}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          className="rounded-md border px-3 py-2 text-sm"
        />
        {errors.amount && (
          <p className="text-destructive text-xs">{errors.amount.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Conta (opcional — debita dinheiro real)
        </label>
        <Controller
          control={control}
          name="accountId"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Apenas registrar progresso">
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
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Observação (opcional)</label>
        <input
          {...register("note")}
          type="text"
          placeholder="ex: Mesada de julho"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <input type="hidden" {...register("goalId")} />

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error ? error.message : "Erro ao aportar."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Aportndo…" : "Registrar aporte"}
      </button>
    </form>
  )
}
