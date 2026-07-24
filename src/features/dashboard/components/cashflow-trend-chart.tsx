"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { DashboardSummary } from "@/features/dashboard/api/dashboard"

type Props = {
  data: DashboardSummary["cashflowTrend"]
}

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export function CashflowTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Sem dados suficientes para a curva de tendência no período.
      </p>
    )
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Velocidade de gasto (burn rate)
        </h3>
        <span className="text-muted-foreground text-xs">
          Acumulado no período
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => fmtCurrency.format(Number(v))} />
            <Tooltip
              formatter={(value) => fmtCurrency.format(Number(value ?? 0))}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="income_realized_acc"
              stroke="#16a34a"
              fillOpacity={0}
              name="Entradas realizadas"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense_realized_acc"
              stroke="#dc2626"
              fill="url(#expenseFill)"
              name="Saídas realizadas"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense_projected_acc"
              stroke="#94a3b8"
              fillOpacity={0}
              strokeDasharray="5 5"
              name="Saídas projetadas"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
