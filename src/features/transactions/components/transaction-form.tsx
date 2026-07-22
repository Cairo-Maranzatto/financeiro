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
import { CategorySelect } from "@/shared/components/category-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import type { Currency } from "@/features/accounts/domain/schemas"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"
import {
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
} from "@/features/transactions/hooks/use-transactions"
import {
  createTransactionSchema,
  type CreateTransactionInput,
  type TransactionType,
} from "@/features/transactions/domain/schemas"

type FormInput = z.input<typeof createTransactionSchema>

type InitialTransaction = {
  id: string
  accountId: string
  categoryId: string
  type: TransactionType
  amount: number
  currency: Currency
  description?: string | null
  occurredAt: string
}

export function TransactionForm({
  defaultAccountId,
  initial,
}: {
  defaultAccountId?: string
  /** Presente = modo edição de um lançamento existente (despesa/receita). */
  initial?: InitialTransaction
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const isEditing = !!initial

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: initial
      ? {
          type: initial.type,
          accountId: initial.accountId,
          categoryId: initial.categoryId,
          amount: Math.abs(initial.amount),
          currency: initial.currency,
          description: initial.description ?? undefined,
          occurredAt: initial.occurredAt.slice(0, 10),
        }
      : {
          type: "despesa",
          accountId: defaultAccountId,
          currency: "BRL",
          occurredAt: new Date().toISOString().slice(0, 10),
        },
  })

  const type = useWatch({ control, name: "type" })
  const accountId = useWatch({ control, name: "accountId" })
  const selectedAccount = accounts?.find((account) => account.id === accountId)
  const categoryTypeLabel = type === "despesa" ? "Despesa" : "Receita"

  async function onSubmit(values: CreateTransactionInput) {
    setServerError(null)
    const currency =
      (selectedAccount?.currency as Currency | undefined) ?? values.currency
    try {
      if (initial) {
        await updateTransaction.mutateAsync({
          ...values,
          id: initial.id,
          currency,
        })
      } else {
        await createTransaction.mutateAsync({ ...values, currency })
      }
      router.replace(
        `/contas/${values.accountId ?? defaultAccountId ?? initial?.accountId}`
      )
      router.refresh()
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o lançamento. Tente novamente."
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
        <Label htmlFor="type">Tipo</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => {
            const typeLabel =
              field.value === "despesa"
                ? "Despesa"
                : field.value === "receita"
                  ? "Receita"
                  : undefined
            return (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Selecione o tipo">
                    {typeLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            )
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="accountId">Conta</Label>
        <Controller
          name="accountId"
          control={control}
          render={({ field }) => {
            const label = accounts?.find((a) => a.id === field.value)?.name
            return (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="accountId" className="w-full">
                  <SelectValue placeholder="Selecione a conta">
                    {label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }}
        />
        {errors.accountId && (
          <p className="text-destructive text-sm">{errors.accountId.message}</p>
        )}
      </div>

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
              filter={(category) =>
                !category.is_internal &&
                (category.type === categoryTypeLabel ||
                  category.type === "Ambas")
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
        <Label htmlFor="amount">Valor</Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              id="amount"
              value={Number(field.value) || 0}
              onChange={field.onChange}
            />
          )}
        />
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
        {isSubmitting
          ? "Salvando..."
          : isEditing
            ? "Salvar alterações"
            : "Salvar lançamento"}
      </Button>
    </form>
  )
}
