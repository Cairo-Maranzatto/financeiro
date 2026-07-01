"use client"

import Link from "next/link"

import { useLoans, useDeleteLoan } from "@/features/loans/hooks/use-loans"

const STATUS_LABEL: Record<string, string> = {
  Ativo: "Ativo",
  Quitado: "Quitado",
  Cancelado: "Cancelado",
}

const STATUS_COLOR: Record<string, string> = {
  Ativo: "text-yellow-600",
  Quitado: "text-green-600",
  Cancelado: "text-muted-foreground line-through",
}

export function LoanList() {
  const { data: loans, isLoading, error } = useLoans()
  const { mutate: deleteLoan, isPending: deleting } = useDeleteLoan()

  if (isLoading)
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  if (error) return <p className="text-destructive text-sm">{error.message}</p>
  if (!loans?.length)
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum empréstimo cadastrado.
      </p>
    )

  return (
    <ul className="flex flex-col gap-3">
      {loans.map((loan) => (
        <li
          key={loan.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex flex-col gap-0.5">
            <Link
              href={`/emprestimos/${loan.id}`}
              className="text-sm font-medium hover:underline"
            >
              {loan.name}
            </Link>
            <span className="text-muted-foreground text-xs">
              {Number(loan.principal_amount).toLocaleString("pt-BR", {
                style: "currency",
                currency: loan.currency === "BTC" ? "BRL" : loan.currency,
              })}{" "}
              · {loan.installments_count}x · {loan.interest_rate}% a.m.
            </span>
            {loan.accounts && (
              <span className="text-muted-foreground text-xs">
                {loan.accounts.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium ${STATUS_COLOR[loan.status] ?? ""}`}
            >
              {STATUS_LABEL[loan.status] ?? loan.status}
            </span>
            {loan.status === "Ativo" && (
              <button
                onClick={() => deleteLoan(loan.id)}
                disabled={deleting}
                className="text-destructive text-xs hover:underline disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
