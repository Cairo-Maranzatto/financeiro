"use client"

import { use } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { useCreditCards } from "@/features/credit-cards/hooks/use-credit-cards"
import { useUserSettings } from "@/features/identity/hooks/use-user-settings"
import { PurchaseForm } from "@/features/credit-cards/components/purchase-form"

export default function CompraPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: cards } = useCreditCards()
  const { data: settings } = useUserSettings()
  const card = cards?.find((c) => c.id === id)

  if (!card || !settings) {
    return <p className="text-muted-foreground">Carregando...</p>
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Registrar compra — {card.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseForm card={card} userTimezone={settings.timezone} />
        </CardContent>
      </Card>
    </div>
  )
}
