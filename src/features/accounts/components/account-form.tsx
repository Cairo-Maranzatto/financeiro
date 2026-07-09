"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { CurrencyInput } from "@/shared/components/currency-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { useCreateAccount } from "@/features/accounts/hooks/use-accounts"
import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/features/accounts/domain/schemas"

type FormInput = z.input<typeof createAccountSchema>

const CURRENCIES = ["BRL", "USD", "BTC"] as const

export function AccountForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const createAccount = useCreateAccount()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      currency: "BRL",
      initialBalance: 0,
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  })

  const currency = useWatch({ control, name: "currency" })

  async function onSubmit(values: CreateAccountInput) {
    setServerError(null)
    try {
      await createAccount.mutateAsync(values)
      router.replace("/")
      router.refresh()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta. Tente novamente."
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
        <Label htmlFor="name">Nome da conta</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Moeda</Label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder="Selecione a moeda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.currency && (
          <p className="text-destructive text-sm">{errors.currency.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="initialBalance">Saldo inicial</Label>
        <Controller
          name="initialBalance"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="initialBalance"
              value={Number(field.value) || 0}
              onChange={field.onChange}
              currency={currency}
            />
          )}
        />
        {errors.initialBalance && (
          <p className="text-destructive text-sm">
            {errors.initialBalance.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occurredAt">Data do saldo inicial</Label>
        <Input id="occurredAt" type="date" {...register("occurredAt")} />
        {errors.occurredAt && (
          <p className="text-destructive text-sm">
            {errors.occurredAt.message}
          </p>
        )}
      </div>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  )
}
