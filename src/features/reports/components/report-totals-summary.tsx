"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { cn } from "@/shared/lib/utils"

interface TotalData {
  currency: string
  income: number
  expense: number
  net: number
}

interface ReportTotalsSummaryProps {
  data: TotalData[]
}

export function ReportTotalsSummary({ data }: ReportTotalsSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((total) => (
        <Card key={total.currency} className="border-l-primary border-l-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">
              {total.currency}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Receitas</span>
                <span className="font-medium text-green-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: total.currency,
                  }).format(total.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Despesas</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: total.currency,
                  }).format(total.expense)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-semibold">Saldo Líquido</span>
                <span
                  className={cn(
                    "font-bold",
                    total.net >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: total.currency,
                  }).format(total.net)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
