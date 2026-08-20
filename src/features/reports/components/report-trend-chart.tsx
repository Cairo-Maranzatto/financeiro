"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

interface TrendData {
  period: string
  currency: string
  income: number
  expense: number
}

interface ReportTrendChartProps {
  data: TrendData[]
}

export function ReportTrendChart({ data }: ReportTrendChartProps) {
  // Se houver múltiplas moedas, o ideal seria filtrar ou mostrar múltiplos gráficos.
  // Por enquanto, agrupamos ou mostramos o primeiro (simplificado para MVP).
  const currencies = Array.from(new Set(data.map((d) => d.currency)))

  // Formatamos para o Recharts
  // Se tivermos várias moedas, o gráfico pode ficar confuso sem conversão.
  // Regra do projeto: patrimônio segregado por moeda.

  return (
    <div className="space-y-6">
      {currencies.map((currency) => {
        const currencyData = data
          .filter((d) => d.currency === currency)
          .map((d) => ({
            period: d.period,
            receita: Number(d.income),
            despesa: Number(d.expense),
          }))

        return (
          <Card key={currency}>
            <CardHeader>
              <CardTitle>Fluxo de Caixa - {currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currencyData}>
                    <defs>
                      <linearGradient
                        id="colorIncome"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorExpense"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(value: string) => {
                        const date = new Date(value)
                        return date.toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "numeric",
                        })
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value: string | number | Date) =>
                        value ? new Date(value).toLocaleDateString("pt-BR") : ""
                      }
                      formatter={(value: string | number | undefined) =>
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: currency,
                        }).format(Number(value || 0))
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                    />
                    <Area
                      type="monotone"
                      dataKey="despesa"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
