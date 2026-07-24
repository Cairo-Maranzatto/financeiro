"use client"

import { useMemo, useState } from "react"
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts"

import type { DashboardSummary } from "@/features/dashboard/api/dashboard"
import { cn } from "@/shared/lib/utils"

type DrilldownItem = DashboardSummary["categoryDrilldown"][number]

type Props = {
  data: DrilldownItem[]
}

const COLORS = [
  "#2563eb",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
]

const fmtCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function CategoryDrilldownChart({ data }: Props) {
  const [activeParentId, setActiveParentId] = useState<string | null>(null)

  const parentData = useMemo(
    () =>
      data.map((item) => ({
        id: item.parent_category_id,
        name: item.parent_category_name,
        total: item.total,
      })),
    [data]
  )

  const activeParent = useMemo(
    () =>
      data.find((item) => item.parent_category_id === activeParentId) ?? null,
    [data, activeParentId]
  )

  const chartData = activeParent
    ? activeParent.subcategories.map((sub) => ({
        id: sub.category_id,
        name: sub.category_name,
        total: sub.total,
      }))
    : parentData

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">Composição por categoria</h3>
        <p className="text-muted-foreground text-sm">
          Sem despesas realizadas no período.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {activeParent
            ? `Subcategorias de ${activeParent.parent_category_name}`
            : "Composição por categoria"}
        </h3>
        {activeParent && (
          <button
            type="button"
            onClick={() => setActiveParentId(null)}
            className="text-primary text-xs font-medium hover:underline"
          >
            Voltar ao macro
          </button>
        )}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="total"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              onClick={(_, index) => {
                const clicked =
                  typeof index === "number" ? chartData[index] : null
                if (!activeParent && clicked?.id) setActiveParentId(clicked.id)
              }}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => fmtCurrency.format(Number(value ?? 0))}
              contentStyle={{ borderRadius: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {chartData.slice(0, 6).map((item, index) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full")}
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="text-muted-foreground shrink-0">
              {fmtCurrency.format(item.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
