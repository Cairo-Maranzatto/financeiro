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
import {
  useLoanDetail,
  usePayInstallment,
} from "@/features/loans/hooks/use-loans"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"
import { payInstallmentSchema } from "@/features/loans/domain/schemas"

type FormValues = z.input<typeof payInstallmentSchema>
type FormOutput = z.output<typeof payInstallmentSchema>

function PayForm({
  installmentId,
  onSuccess,
}: {
  installmentId: string
  onSuccess: () => void
}) {
  const { data: accounts } = useAccounts()
  const { mutate: pay, isPending } = usePayInstallment()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(payInstallmentSchema),
    defaultValues: { installmentId },
  })

  function onSubmit(values: FormOutput) {
    pay(
      { installmentId: values.installmentId, accountId: values.accountId },
      {
        onSuccess: () => {
          reset()
          onSuccess()
        },
      }
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-2 flex items-end gap-2"
    >
      <div className="flex-1">
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
          <p className="text-destructive mt-0.5 text-xs">
            {errors.accountId.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
      >
        {isPending ? "Pagando…" : "Pagar"}
      </button>
    </form>
  )
}

export function LoanDetail({ id }: { id: string }) {
  const { data: loan, isLoading, error } = useLoanDetail(id)
  const [payingId, setPayingId] = useState<string | null>(null)

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  if (error) return <p className="text-destructive text-sm">{error.message}</p>
  if (!loan) return null

  const sorted = [...loan.loan_installments].sort(
    (a, b) => a.installment_number - b.installment_number
  )
  const paid = sorted.filter((i) => i.status === "Pago").length
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [
            "Principal",
            `${loan.currency} ${Number(loan.principal_amount).toFixed(2)}`,
          ],
          ["Taxa", `${loan.interest_rate}% a.m.`],
          ["Parcelas", `${paid}/${loan.installments_count} pagas`],
          ["Status", loan.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-xs">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-left">Vencimento</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inst) => {
              const overdue =
                inst.status === "Pendente" && inst.due_date < today
              const statusLabel =
                inst.status === "Pago"
                  ? "Pago"
                  : overdue
                    ? "Vencido"
                    : "Pendente"
              const statusColor =
                inst.status === "Pago"
                  ? "text-green-600"
                  : overdue
                    ? "text-destructive"
                    : "text-yellow-600"

              return (
                <tr key={inst.id} className="border-b last:border-b-0">
                  <td className="text-muted-foreground px-3 py-2">
                    {inst.installment_number}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {Number(inst.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">{inst.due_date}</td>
                  <td className={`px-3 py-2 font-medium ${statusColor}`}>
                    {statusLabel}
                  </td>
                  <td className="px-3 py-2">
                    {inst.status !== "Pago" &&
                      (payingId === inst.id ? (
                        <PayForm
                          installmentId={inst.id}
                          onSuccess={() => setPayingId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setPayingId(inst.id)}
                          className="text-primary text-xs hover:underline"
                        >
                          Pagar
                        </button>
                      ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
