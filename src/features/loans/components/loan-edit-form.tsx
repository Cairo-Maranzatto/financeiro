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
import { updateLoanSchema } from "@/features/loans/domain/schemas"
import { useUpdateLoan } from "@/features/loans/hooks/use-loans"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"

type FormValues = z.input<typeof updateLoanSchema>
type FormOutput = z.output<typeof updateLoanSchema>

export function LoanEditForm({
  id,
  initial,
  onSuccess,
}: {
  id: string
  initial: FormOutput
  onSuccess?: () => void
}) {
  const { data: accounts } = useAccounts()
  const { mutate: update, isPending, error } = useUpdateLoan()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(updateLoanSchema),
    defaultValues: initial,
  })

  function onSubmit(values: FormOutput) {
    update(
      { id, input: values },
      {
        onSuccess: () => {
          onSuccess?.()
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Nome do empréstimo</label>
        <input
          {...register("name")}
          type="text"
          className="rounded-md border px-3 py-2 text-sm"
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Direção</label>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tomado">Peguei (dívida)</SelectItem>
                <SelectItem value="concedido">Emprestei (crédito)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.direction && (
          <p className="text-destructive text-xs">{errors.direction.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Conta padrão (opcional)</label>
        <Controller
          control={control}
          name="defaultAccountId"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nenhuma">
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

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error ? error.message : "Erro ao atualizar."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  )
}
