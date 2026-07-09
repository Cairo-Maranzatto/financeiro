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
import { CategorySelect } from "@/shared/components/category-select"
import { useCategories } from "@/features/transactions/hooks/use-transactions"
import { useRegisterPurchase } from "@/features/credit-cards/hooks/use-credit-cards"
import {
  purchaseSchema,
  type PurchaseInput,
} from "@/features/credit-cards/domain/schemas"
import type { CreditCard } from "@/features/credit-cards/api/credit-cards"

type FormInput = z.input<typeof purchaseSchema>

export function PurchaseForm({
  card,
  userTimezone,
}: {
  card: CreditCard
  userTimezone: string
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: categories } = useCategories()
  const registerPurchase = useRegisterPurchase(card, userTimezone)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, PurchaseInput>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      cardId: card.id,
      currency: "BRL",
      installments: 1,
      purchaseDate: new Date().toISOString().slice(0, 10),
    },
  })

  async function onSubmit(values: PurchaseInput) {
    setServerError(null)
    try {
      await registerPurchase.mutateAsync(values)
      router.replace(`/cartoes/${card.id}`)
      router.refresh()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a compra."
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
        <Label htmlFor="categoryId">Categoria</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <CategorySelect
              categories={categories ?? []}
              value={field.value}
              onChange={field.onChange}
              filter={(c) =>
                !c.is_internal && (c.type === "Despesa" || c.type === "Ambas")
              }
              placeholder="Selecione a categoria"
            />
          )}
        />
        {errors.categoryId && (
          <p className="text-destructive text-sm">
            {errors.categoryId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="totalAmount">Valor total</Label>
        <Controller
          name="totalAmount"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="totalAmount"
              value={Number(field.value) || 0}
              onChange={field.onChange}
            />
          )}
        />
        {errors.totalAmount && (
          <p className="text-destructive text-sm">
            {errors.totalAmount.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="installments">Parcelas</Label>
          <Input
            id="installments"
            type="number"
            min={1}
            max={48}
            {...register("installments")}
          />
          {errors.installments && (
            <p className="text-destructive text-sm">
              {errors.installments.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchaseDate">Data da compra</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
          {errors.purchaseDate && (
            <p className="text-destructive text-sm">
              {errors.purchaseDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" {...register("description")} />
      </div>

      {serverError && <p className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Registrando..." : "Registrar compra"}
      </Button>
    </form>
  )
}
