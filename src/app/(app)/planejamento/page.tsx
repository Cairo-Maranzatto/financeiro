import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { BudgetList } from "@/features/planning/components/budget-list"
import { BudgetForm } from "@/features/planning/components/budget-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export default function PlanejamentoPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Planejamento</h1>
          <p className="text-muted-foreground text-sm">
            Orçamentos do mês financeiro atual
          </p>
        </div>
        <Link
          href="/planejamento/recorrencias"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Recorrências
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Meus orçamentos
          </h2>
          <BudgetList />
        </section>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Novo orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetForm />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
