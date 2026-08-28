"use client"

import Link from "next/link"

import { useLoans, useDeleteLoan } from "@/features/loans/hooks/use-loans"
import type { LoanRow } from "@/features/loans/api/loans"

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

const DIRECTION_LABEL: Record<string, string> = {
  tomado: "Peguei",
  concedido: "Emprestei",
}

const DIRECTION_COLOR: Record<string, string> = {
  tomado: "text-destructive",
  concedido: "text-green-600",
}

function LoanRowItem({
  loan,
  onCancel,
  deleting,
}: {
  loan: LoanRow
  onCancel: (id: string) => void
  deleting: boolean
}) {
  return (
    <li className="flex items-center justify-between rounded-lg border p-4">
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
          className={`text-xs font-medium ${DIRECTION_COLOR[loan.direction] ?? ""}`}
        >
          {DIRECTION_LABEL[loan.direction] ?? loan.direction}
        </span>
        <span
          className={`text-xs font-medium ${STATUS_COLOR[loan.status] ?? ""}`}
        >
          {STATUS_LABEL[loan.status] ?? loan.status}
        </span>
        <Link
          href={`/emprestimos/${loan.id}/editar`}
          className="text-primary text-xs hover:underline"
        >
          Editar
        </Link>
        {loan.status === "Ativo" && (
          <button
            onClick={() => onCancel(loan.id)}
            disabled={deleting}
            className="text-destructive text-xs hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </li>
  )
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

  const tomados = loans.filter((l) => l.direction === "tomado")
  const concedidos = loans.filter((l) => l.direction === "concedido")

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Peguei (dívidas)
        </h2>
        {tomados.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum empréstimo tomado.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tomados.map((loan) => (
              <LoanRowItem
                key={loan.id}
                loan={loan}
                onCancel={deleteLoan}
                deleting={deleting}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Emprestei (créditos)
        </h2>
        {concedidos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum empréstimo concedido.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {concedidos.map((loan) => (
              <LoanRowItem
                key={loan.id}
                loan={loan}
                onCancel={deleteLoan}
                deleting={deleting}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
