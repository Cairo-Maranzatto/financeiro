import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { RecurrenceList } from "@/features/planning/components/recurrence-list"
import { RecurrenceForm } from "@/features/planning/components/recurrence-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export default function RecorrenciasPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Recorrências</h1>
          <p className="text-muted-foreground text-sm">
            Lançamentos automáticos periódicos
          </p>
        </div>
        <Link
          href="/planejamento"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          ← Orçamentos
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Regras ativas
          </h2>
          <RecurrenceList />
        </section>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Nova recorrência</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurrenceForm />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
