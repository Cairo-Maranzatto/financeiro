"use client"

import { use } from "react"
import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import {
  useCardAvailableLimit,
  useCardInvoices,
  useCreditCards,
} from "@/features/credit-cards/hooks/use-credit-cards"
import { InvoiceDetail } from "@/features/credit-cards/components/invoice-detail"

export default function CartaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: cards } = useCreditCards()
  const { data: invoices } = useCardInvoices(id)
  const { data: limit } = useCardAvailableLimit(id)
  const card = cards?.find((c) => c.id === id)

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{card?.name ?? "Cartão"}</h1>
          <p className="text-muted-foreground text-sm">
            Limite disponível:{" "}
            <span className="text-foreground font-medium">
              {limit !== undefined && limit !== null
                ? fmt(Number(limit))
                : "..."}{" "}
              de {card ? fmt(Number(card.credit_limit)) : "..."}
            </span>
          </p>
          <p className="text-muted-foreground text-sm">
            Fechamento dia {card?.closing_day} · Vencimento dia {card?.due_day}
          </p>
        </div>
        <Link href={`/cartoes/${id}/compra`} className={cn(buttonVariants())}>
          Registrar compra
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {!invoices || invoices.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma fatura ainda.</p>
        ) : (
          invoices.map((invoice) => (
            <InvoiceDetail key={invoice.id} invoice={invoice} />
          ))
        )}
      </div>
    </div>
  )
}
