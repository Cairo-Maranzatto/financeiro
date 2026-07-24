"use client"

import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard"
import { BalanceCard } from "@/features/dashboard/components/balance-card"
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions"
import { FinancialIndicators } from "@/features/dashboard/components/financial-indicators"
import { DashboardKpis } from "@/features/dashboard/components/dashboard-kpis"
import { CashflowTrendChart } from "@/features/dashboard/components/cashflow-trend-chart"
import { CategoryDrilldownChart } from "@/features/dashboard/components/category-drilldown-chart"
import { DashboardAlerts } from "@/features/dashboard/components/dashboard-alerts"

function formatDateStr(
  dateStr: string,
  options: Intl.DateTimeFormatOptions
): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", options)
}

function buildPeriodLabel(start: string, endExclusive: string): string {
  const startLabel = formatDateStr(start, { day: "2-digit", month: "short" })
  // endExclusive is first day of next period; subtract 1 to get inclusive last day
  const [ey, em, ed] = endExclusive.split("-").map(Number)
  const lastDay = new Date(ey, em - 1, ed - 1)
  const endLabel = lastDay.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${startLabel} – ${endLabel}`
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
      {children}
    </h2>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-muted animate-pulse rounded", className)} />
}

export function DashboardView() {
  const { data, isLoading, error } = useDashboardSummary()

  return (
    <div className="flex flex-col gap-8">
      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/transferencias/nova"
          className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
        >
          Transferir
        </Link>
        <Link
          href="/transacoes/nova"
          className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
        >
          Novo lançamento
        </Link>
        <Link href="/contas/nova" className={cn(buttonVariants(), "text-sm")}>
          Nova conta
        </Link>
      </div>

      {/* Patrimônio por moeda */}
      <section className="flex flex-col gap-3">
        <SectionTitle>Patrimônio</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : data?.balancesByCurrency.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem contas cadastradas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data?.balancesByCurrency.map((b) => (
              <BalanceCard
                key={b.currency}
                currency={b.currency}
                balance={Number(b.balance)}
              />
            ))}
          </div>
        )}
      </section>

      {/* KPI e período */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <SectionTitle>Resumo financeiro</SectionTitle>
          {data && (
            <span className="text-muted-foreground text-xs">
              {buildPeriodLabel(data.periodStart, data.periodEnd)}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          data && <DashboardKpis summary={data} />
        )}
      </section>

      {/* Núcleo analítico */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <CashflowTrendChart data={data?.cashflowTrend ?? []} />
          )}
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <CategoryDrilldownChart data={data?.categoryDrilldown ?? []} />
          )}
        </div>
      </section>

      {/* Indicadores financeiros clássicos */}
      {!isLoading && data && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Indicadores</SectionTitle>
          <FinancialIndicators indicators={data.indicators} />
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <DashboardAlerts alerts={data?.alerts ?? []} />
          )}
        </div>
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Últimas transações</SectionTitle>
            <Link
              href="/contas"
              className="text-primary text-xs hover:underline"
            >
              Ver contas
            </Link>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <RecentTransactions transactions={data?.recentTransactions ?? []} />
          )}
        </div>
      </section>

      {error && (
        <p className="text-destructive text-sm">
          Erro ao carregar o dashboard. Tente recarregar a página.
        </p>
      )}
    </div>
  )
}
