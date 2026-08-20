"use client"

import * as React from "react"
import { Label } from "@/shared/ui/label"
import { Input } from "@/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { ReportFilters } from "../domain/schemas"
import { useAccounts } from "@/features/accounts/hooks/use-accounts"

interface ReportFiltersProps {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
}

const INTERVAL_LABELS: Record<string, string> = {
  day: "Diário",
  week: "Semanal",
  month: "Mensal",
}

const LEVEL_LABELS: Record<string, string> = {
  parent: "Categorias-Pai",
  child: "Subcategorias",
}

export function ReportFiltersPanel({ filters, onChange }: ReportFiltersProps) {
  const { data: accounts } = useAccounts()

  return (
    <div className="bg-card flex flex-wrap gap-4 rounded-lg border p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="start">Início</Label>
        <Input
          type="date"
          id="start"
          className="w-[150px]"
          value={filters.start}
          onChange={(e) => onChange({ ...filters, start: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="end">Fim (Exclusive)</Label>
        <Input
          type="date"
          id="end"
          className="w-[150px]"
          value={filters.endExclusive}
          onChange={(e) =>
            onChange({ ...filters, endExclusive: e.target.value })
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Conta</Label>
        <Select
          value={filters.accountId || "all"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              accountId: v === "all" || v === null ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas as Contas">
              {filters.accountId
                ? accounts?.find((a) => a.id === filters.accountId)?.name
                : "Todas as Contas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Contas</SelectItem>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Intervalo do Gráfico</Label>
        <Select
          value={filters.trendInterval}
          onValueChange={(v) =>
            v &&
            onChange({
              ...filters,
              trendInterval: v as ReportFilters["trendInterval"],
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Intervalo">
              {INTERVAL_LABELS[filters.trendInterval]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Diário</SelectItem>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Nível de Categoria</Label>
        <Select
          value={filters.categoryLevel}
          onValueChange={(v) =>
            v &&
            onChange({
              ...filters,
              categoryLevel: v as ReportFilters["categoryLevel"],
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Nível">
              {LEVEL_LABELS[filters.categoryLevel]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parent">Categorias-Pai</SelectItem>
            <SelectItem value="child">Subcategorias</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
