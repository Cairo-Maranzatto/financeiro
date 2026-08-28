"use client"

import { use } from "react"
import { useRouter } from "next/navigation"

import { useLoanDetail } from "@/features/loans/hooks/use-loans"
import { LoanEditForm } from "@/features/loans/components/loan-edit-form"

export default function EditarEmprestimoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: loan, isLoading, error } = useLoanDetail(id)
  const router = useRouter()

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>

  if (error || !loan)
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar este empréstimo.
      </p>
    )

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Editar empréstimo</h1>
      <div className="rounded-xl border p-6">
        <LoanEditForm
          id={loan.id}
          initial={{
            name: loan.name,
            direction: loan.direction as "tomado" | "concedido",
            defaultAccountId: loan.default_account_id ?? undefined,
          }}
          onSuccess={() => router.push(`/emprestimos/${loan.id}`)}
        />
      </div>
    </main>
  )
}
