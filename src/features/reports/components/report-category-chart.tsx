"use client"

import * as React from "react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

interface CategoryData {
  category_id: string
  category_name: string
  total: number
}

interface ReportCategoryChartProps {
  data: CategoryData[]
  title: string
  onCategoryClick?: (categoryId: string) => void
  selectedCategoryId?: string | null
}

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
]

export function ReportCategoryChart({
  data,
  title,
  onCategoryClick,
  selectedCategoryId,
}: ReportCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex h-[300px] items-center justify-center">
          Nenhum dado encontrado
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    name: d.category_name,
    value: Number(d.total),
    category_id: d.category_id,
  }))

  return (
    <Card
      className={cn(
        "h-full transition-all",
        selectedCategoryId && "ring-primary ring-2"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {selectedCategoryId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCategoryClick?.("")}
            className="h-8 px-2 text-xs"
          >
            Limpar Filtro
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(entry: any) => {
                  if (entry && entry.category_id) {
                    onCategoryClick?.(entry.category_id)
                  }
                }}
                className="cursor-pointer"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "decimal",
                    minimumFractionDigits: 2,
                  }).format(
                    Number(Array.isArray(value) ? value[0] : value || 0)
                  )
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
