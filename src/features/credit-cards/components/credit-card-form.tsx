"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { CurrencyInput } from "@/shared/components/currency-input"
import { useCreateCreditCard } from "@/features/credit-cards/hooks/use-credit-cards"
import {
  createCreditCardSchema,
  type CreateCreditCardInput,
} from "@/features/credit-cards/domain/schemas"

type FormInput = z.input<typeof createCreditCardSchema>

export function CreditCardForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const create = useCreateCreditCard()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, CreateCreditCardInput>({
    resolver: zodResolver(createCreditCardSchema),
    defaultValues: { closingDay: 1, dueDay: 10 },
  })

  async function onSubmit(values: CreateCreditCardInput) {
    setServerError(null)
    try {
      const card = await create.mutateAsync(values)
      router.replace(`/cartoes/${card.id}`)
      router.refresh()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o cartão."
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
        <Label htmlFor="name">Nome do cartão</Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="creditLimit">Limite</Label>
        <Controller
          name="creditLimit"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="creditLimit"
              value={Number(field.value) || 0}
              onChange={field.onChange}
            />
          )}
        />
        {errors.creditLimit && (
          <p className="text-destructive text-sm">
            {errors.creditLimit.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="closingDay">Dia de fechamento</Label>
          <Input
            id="closingDay"
            type="number"
            min={1}
            max={28}
            {...register("closingDay")}
          />
          {errors.closingDay && (
            <p className="text-destructive text-sm">
              {errors.closingDay.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDay">Dia de vencimento</Label>
          <Input
            id="dueDay"
            type="number"
            min={1}
            max={28}
            {...register("dueDay")}
          />
          {errors.dueDay && (
            <p className="text-destructive text-sm">{errors.dueDay.message}</p>
          )}
        </div>
      </div>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Criando..." : "Criar cartão"}
      </Button>
    </form>
  )
}
