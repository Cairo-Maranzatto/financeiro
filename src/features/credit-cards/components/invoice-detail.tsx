"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"
import {
  useInvoiceTransactions,
  usePayInvoice,
} from "@/features/credit-cards/hooks/use-credit-cards"
import type { Invoice } from "@/features/credit-cards/api/credit-cards"

function fmt(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value))
}

const STATUS_LABELS: Record<string, string> = {
  Aberta: "Em aberto",
  Fechada: "Fechada — aguardando pagamento",
  Paga: "Paga",
  Vencida: "Vencida",
}

export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const { data: transactions } = useInvoiceTransactions(invoice.id)
  const { data: accounts } = useAccounts()
  const payInvoice = usePayInvoice()
  const [payError, setPayError] = useState<string | null>(null)
  const total = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ accountId: string }>({
    defaultValues: { accountId: "" },
  })

  const canPay = invoice.status === "Fechada" || invoice.status === "Vencida"

  async function onPay({ accountId }: { accountId: string }) {
    setPayError(null)
    try {
      await payInvoice.mutateAsync({ invoiceId: invoice.id, accountId })
    } catch (error) {
      setPayError(
        error instanceof Error ? error.message : "Erro ao pagar fatura."
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Fatura {fmtDate(invoice.reference_month + "T12:00:00Z")}</span>
          <span className="text-muted-foreground text-sm font-normal">
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>
            Fechamento: {fmtDate(invoice.closing_date + "T12:00:00Z")}
          </span>
          <span>Vencimento: {fmtDate(invoice.due_date + "T12:00:00Z")}</span>
        </div>

        <p className="text-2xl font-semibold">{fmt(Math.abs(total))}</p>

        {transactions && transactions.length > 0 && (
          <ul className="divide-border flex flex-col divide-y text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>{t.description || "Compra"}</span>
                <span>{fmt(Math.abs(Number(t.amount)))}</span>
              </li>
            ))}
          </ul>
        )}

        {canPay && (
          <form
            method="post"
            onSubmit={handleSubmit(onPay)}
            className="flex flex-col gap-2 border-t pt-4"
          >
            <Controller
              name="accountId"
              control={control}
              render={({ field }) => {
                const label = accounts?.find((a) => a.id === field.value)?.name
                return (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Conta para pagamento">
                        {label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }}
            />
            {payError && <p className="text-destructive text-sm">{payError}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Pagando..." : `Pagar ${fmt(Math.abs(total))}`}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
