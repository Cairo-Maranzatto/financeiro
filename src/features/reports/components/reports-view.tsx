"use client"

import * as React from "react"
import { useState } from "react"
import { toDateString } from "@/shared/domain/financial-month"
import { ReportFilters } from "../domain/schemas"
import { useReport } from "../hooks/use-report"
import { ReportFiltersPanel } from "./report-filters"
import { ReportTotalsSummary } from "./report-totals-summary"
import { ReportTrendChart } from "./report-trend-chart"
import { ReportCategoryChart } from "./report-category-chart"
import { ReportTransactionList } from "./report-transaction-list"
import { Button } from "@/shared/ui/button"

export function ReportsView() {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const initialFilters: ReportFilters = {
    start: toDateString(firstDayOfMonth),
    endExclusive: toDateString(lastDayOfMonth),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    categoryLevel: "parent",
    trendInterval: "day",
  }

  const [filters, setFilters] = useState<ReportFilters>(initialFilters)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  )

  const setPreset = (preset: "thisMonth" | "thisYear" | "last12Months") => {
    const today = new Date()
    let start: Date
    let end: Date = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    if (preset === "thisMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
    } else if (preset === "thisYear") {
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today.getFullYear() + 1, 0, 1)
    } else {
      start = new Date(today.getFullYear() - 1, today.getMonth(), 1)
    }

    setFilters({
      ...filters,
      start: toDateString(start),
      endExclusive: toDateString(end),
    })
    setSelectedCategoryId(null)
  }

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters)
    setSelectedCategoryId(null)
  }

  const exportToCsv = () => {
    if (!data?.transactions) return

    const headers = [
      "Data",
      "Descrição",
      "Conta",
      "Categoria",
      "Tipo",
      "Status",
      "Valor",
      "Moeda",
    ]
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.occurred_at).toLocaleDateString("pt-BR"),
      tx.description || "",
      tx.accounts?.name || "",
      tx.categories?.name || "",
      tx.type,
      tx.status,
      tx.amount.toString(),
      tx.currency,
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `relatorio_${filters.start}_ate_${filters.endExclusive}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const { data, isLoading, error } = useReport(filters)

  const filteredTransactions =
    data?.transactions.filter((tx) => {
      // Filter by category
      if (selectedCategoryId) {
        const matchesCategory =
          filters.categoryLevel === "parent"
            ? (tx.categories?.parent_category_id || tx.category_id) ===
              selectedCategoryId
            : tx.category_id === selectedCategoryId

        if (!matchesCategory) return false
      }

      // Filter by search description
      if (filters.description) {
        const search = filters.description.toLowerCase()
        const matchesDescription = tx.description
          ?.toLowerCase()
          .includes(search)
        if (!matchesDescription) return false
      }

      return true
    }) || []

  const selectedCategoryName =
    data?.categoriesIncome.find((c) => c.category_id === selectedCategoryId)
      ?.category_name ||
    data?.categoriesExpense.find((c) => c.category_id === selectedCategoryId)
      ?.category_name

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada do seu fluxo financeiro e composição de gastos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("thisMonth")}
          >
            Este Mês
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("thisYear")}
          >
            Este Ano
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("last12Months")}
          >
            Últimos 12 Meses
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportToCsv}
            disabled={!filteredTransactions.length}
          >
            Exportar CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilters(initialFilters)
              setSelectedCategoryId(null)
            }}
          >
            Resetar
          </Button>
        </div>
      </div>

      <ReportFiltersPanel filters={filters} onChange={handleFilterChange} />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        </div>
      )}

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
          {(error as Error).message}
        </div>
      )}

      {data && !isLoading && (
        <div className="animate-in fade-in space-y-8 duration-500">
          <ReportTotalsSummary data={data.totals} />

          <ReportTrendChart data={data.trend} />

          <div className="grid gap-6 md:grid-cols-2">
            <ReportCategoryChart
              data={data.categoriesIncome}
              title="Receitas por Categoria"
              onCategoryClick={setSelectedCategoryId}
              selectedCategoryId={selectedCategoryId}
            />
            <ReportCategoryChart
              data={data.categoriesExpense}
              title="Despesas por Categoria"
              onCategoryClick={setSelectedCategoryId}
              selectedCategoryId={selectedCategoryId}
            />
          </div>

          <ReportTransactionList
            transactions={filteredTransactions}
            title={
              selectedCategoryName
                ? `Transações: ${selectedCategoryName}`
                : "Transações do Período"
            }
          />
        </div>
      )}
    </div>
  )
}
