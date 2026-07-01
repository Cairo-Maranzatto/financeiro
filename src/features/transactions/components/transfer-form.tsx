"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"
import { useTransfer } from "@/features/transactions/hooks/use-transactions"
import {
  transferSchema,
  type TransferInput,
} from "@/features/transactions/domain/schemas"

type FormInput = z.input<typeof transferSchema>

export function TransferForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: accounts } = useAccounts()
  const transfer = useTransfer()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  })

  async function onSubmit(values: TransferInput) {
    setServerError(null)
    try {
      await transfer.mutateAsync(values)
      router.replace("/")
      router.refresh()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a transferência."
      )
    }
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="originAccountId">Conta de origem</Label>
        <Controller
          name="originAccountId"
          control={control}
          render={({ field }) => {
            const account = accounts?.find((a) => a.id === field.value)
            const label = account
              ? `${account.name} (${account.currency})`
              : undefined
            return (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="originAccountId" className="w-full">
                  <SelectValue placeholder="Selecione a conta de origem">
                    {label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
        {errors.originAccountId && (
          <p className="text-destructive text-sm">
            {errors.originAccountId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="destinationAccountId">Conta de destino</Label>
        <Controller
          name="destinationAccountId"
          control={control}
          render={({ field }) => {
            const account = accounts?.find((a) => a.id === field.value)
            const label = account
              ? `${account.name} (${account.currency})`
              : undefined
            return (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="destinationAccountId" className="w-full">
                  <SelectValue placeholder="Selecione a conta de destino">
                    {label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
        {errors.destinationAccountId && (
          <p className="text-destructive text-sm">
            {errors.destinationAccountId.message}
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Só é possível transferir entre contas da mesma moeda.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Valor</Label>
        <Input id="amount" type="number" step="any" {...register("amount")} />
        {errors.amount && (
          <p className="text-destructive text-sm">{errors.amount.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">Data</Label>
        <Input id="occurredAt" type="date" {...register("occurredAt")} />
        {errors.occurredAt && (
          <p className="text-destructive text-sm">
            {errors.occurredAt.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Transferindo..." : "Transferir"}
      </Button>
    </form>
  )
}
