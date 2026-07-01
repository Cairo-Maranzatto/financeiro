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
import { createGoalSchema } from "@/features/planning/domain/schemas"
import { useCreateGoal } from "@/features/planning/hooks/use-goals"

type FormValues = z.input<typeof createGoalSchema>
type FormOutput = z.output<typeof createGoalSchema>

export function GoalForm({ onSuccess }: { onSuccess?: () => void }) {
  const { mutate: create, isPending, error } = useCreateGoal()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: { currency: "BRL" },
  })

  function onSubmit(values: FormOutput) {
    create(values, {
      onSuccess: () => {
        reset()
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nome da meta</label>
        <input
          {...register("name")}
          type="text"
          placeholder="ex: Viagem Europa, Fundo de emergência"
          className="rounded-md border px-3 py-2 text-sm"
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Valor alvo</label>
          <input
            {...register("targetAmount")}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            className="rounded-md border px-3 py-2 text-sm"
          />
          {errors.targetAmount && (
            <p className="text-destructive text-xs">
              {errors.targetAmount.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Moeda</label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{field.value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Data alvo (opcional)</label>
        <input
          {...register("targetDate")}
          type="date"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error ? error.message : "Erro ao criar meta."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Criar meta"}
      </button>
    </form>
  )
}
