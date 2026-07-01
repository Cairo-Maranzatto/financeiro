"use client"

import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import {
  useCardAvailableLimit,
  useCreditCards,
} from "@/features/credit-cards/hooks/use-credit-cards"
import type { CreditCard } from "@/features/credit-cards/api/credit-cards"

function CardItem({ card }: { card: CreditCard }) {
  const { data: limit } = useCardAvailableLimit(card.id)
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v)

  return (
    <Link href={`/cartoes/${card.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <CardTitle>{card.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between text-sm">
          <span className="text-muted-foreground">Limite disponível</span>
          <span className="font-medium">
            {limit !== undefined && limit !== null ? fmt(Number(limit)) : "..."}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function CartoesPage() {
  const { data: cards, isLoading } = useCreditCards()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cartões de crédito</h1>
        <Link href="/cartoes/novo" className={cn(buttonVariants())}>
          Novo cartão
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && (!cards || cards.length === 0) && (
        <p className="text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
      )}
      {cards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}
