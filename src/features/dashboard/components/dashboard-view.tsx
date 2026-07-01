"use client"

import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard"
import { BalanceCard } from "@/features/dashboard/components/balance-card"
import { CategoryBars } from "@/features/dashboard/components/category-bars"
import { RecentTransactions } from "@/features/dashboard/components/recent-transactions"

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

  const monthFmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v)

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

      {/* Gastos do mês */}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <SectionTitle>Gastos do mês</SectionTitle>
          {data && (
            <span className="text-muted-foreground text-xs">
              {buildPeriodLabel(data.periodStart, data.periodEnd)}
            </span>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-44" />
        ) : (
          <p className="text-3xl font-bold">
            {monthFmt(data?.monthExpenses ?? 0)}
          </p>
        )}
      </section>

      {/* Top categorias */}
      {!isLoading && (data?.topCategories.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Por categoria</SectionTitle>
          <CategoryBars categories={data!.topCategories} />
        </section>
      )}

      {/* Últimas transações */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Últimas transações</SectionTitle>
          <Link href="/contas" className="text-primary text-xs hover:underline">
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
      </section>

      {error && (
        <p className="text-destructive text-sm">
          Erro ao carregar o dashboard. Tente recarregar a página.
        </p>
      )}
    </div>
  )
}
