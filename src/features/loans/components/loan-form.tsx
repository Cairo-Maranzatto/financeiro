"use client"

import { useState } from "react"
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
import { createLoanSchema } from "@/features/loans/domain/schemas"
import {
  CurrencyInput,
  INPUT_PLAIN_CLASS,
} from "@/shared/components/currency-input"
import {
  calcLoanInstallments,
  totalLoanAmount,
} from "@/features/loans/domain/loan-calculator"
import { useCreateLoan } from "@/features/loans/hooks/use-loans"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"

type FormValues = z.input<typeof createLoanSchema>
type FormOutput = z.output<typeof createLoanSchema>

const todayStr = new Date().toISOString().slice(0, 10)

export function LoanForm({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const { data: accounts } = useAccounts()
  const { mutate: create, isPending, error } = useCreateLoan()
  const [preview, setPreview] = useState<ReturnType<
    typeof calcLoanInstallments
  > | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      interestRate: 0,
      currency: "BRL",
      firstDueDate: todayStr,
    },
  })

  const currency = watch("currency")

  function handlePreview() {
    const values = watch()
    const principal = parseFloat(String(values.principalAmount))
    const rate = parseFloat(String(values.interestRate))
    const count = parseInt(String(values.installmentsCount))
    const firstDue = values.firstDueDate
    if (!principal || !count || !firstDue) return
    setPreview(calcLoanInstallments(principal, rate || 0, count, firstDue))
  }

  function onSubmit(values: FormOutput) {
    const installments = calcLoanInstallments(
      values.principalAmount,
      values.interestRate,
      values.installmentsCount,
      values.firstDueDate
    )
    create(
      { input: values, installments },
      {
        onSuccess: (id) => {
          reset()
          setPreview(null)
          onSuccess?.(id)
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
          placeholder="ex: Financiamento Veículo"
          className="rounded-md border px-3 py-2 text-sm"
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Valor principal</label>
          <Controller
            control={control}
            name="principalAmount"
            render={({ field }) => (
              <CurrencyInput
                value={Number(field.value) || 0}
                onChange={field.onChange}
                currency={currency}
                className={INPUT_PLAIN_CLASS}
              />
            )}
          />
          {errors.principalAmount && (
            <p className="text-destructive text-xs">
              {errors.principalAmount.message}
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Parcelas</label>
          <input
            {...register("installmentsCount")}
            type="number"
            min="1"
            max="360"
            placeholder="12"
            className="rounded-md border px-3 py-2 text-sm"
          />
          {errors.installmentsCount && (
            <p className="text-destructive text-xs">
              {errors.installmentsCount.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Taxa mensal (%)</label>
          <input
            {...register("interestRate")}
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            className="rounded-md border px-3 py-2 text-sm"
          />
          {errors.interestRate && (
            <p className="text-destructive text-xs">
              {errors.interestRate.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">1ª parcela em</label>
          <input
            {...register("firstDueDate")}
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
          />
          {errors.firstDueDate && (
            <p className="text-destructive text-xs">
              {errors.firstDueDate.message}
            </p>
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
      </div>

      <button
        type="button"
        onClick={handlePreview}
        className="rounded-md border px-4 py-2 text-sm"
      >
        Prévia das parcelas
      </button>

      {preview && (
        <div className="overflow-x-auto rounded-lg border text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b">
                <th className="px-3 py-1.5 text-left">#</th>
                <th className="px-3 py-1.5 text-right">Valor</th>
                <th className="px-3 py-1.5 text-left">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 6).map((inst) => (
                <tr key={inst.installmentNumber} className="border-b">
                  <td className="px-3 py-1.5">{inst.installmentNumber}</td>
                  <td className="px-3 py-1.5 text-right">
                    {Number(inst.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5">{inst.dueDate}</td>
                </tr>
              ))}
              {preview.length > 6 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-muted-foreground px-3 py-1.5 text-center"
                  >
                    … e mais {preview.length - 6} parcelas · Total:{" "}
                    {totalLoanAmount(preview).toFixed(2)} {currency}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p className="text-destructive text-xs">
          {error instanceof Error ? error.message : "Erro ao criar empréstimo."}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Salvando…" : "Criar empréstimo"}
      </button>
    </form>
  )
}
