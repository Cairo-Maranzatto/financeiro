"use client"

import { use } from "react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { TransactionForm } from "@/features/transactions/components/transaction-form"
import { TransferForm } from "@/features/transactions/components/transfer-form"
import {
  useTransaction,
  useTransferByTransactionId,
} from "@/features/transactions/hooks/use-transactions"
import type { Currency } from "@/features/accounts/domain/schemas"

function EditorCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

function TransferEditor({ transactionId }: { transactionId: string }) {
  const {
    data: transfer,
    isLoading,
    error,
  } = useTransferByTransactionId(transactionId)

  if (isLoading)
    return (
      <EditorCard title="Editar transferência">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </EditorCard>
    )

  if (error || !transfer)
    return (
      <EditorCard title="Editar transferência">
        <p className="text-destructive text-sm">
          Não foi possível carregar esta transferência.
        </p>
      </EditorCard>
    )

  return (
    <EditorCard title="Editar transferência">
      <TransferForm initial={transfer} />
    </EditorCard>
  )
}

export default function EditarTransacaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: transaction, isLoading, error } = useTransaction(id)

  if (isLoading)
    return (
      <EditorCard title="Editar lançamento">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </EditorCard>
    )

  if (error || !transaction)
    return (
      <EditorCard title="Editar lançamento">
        <p className="text-destructive text-sm">
          Não foi possível carregar este lançamento.
        </p>
      </EditorCard>
    )

  if (transaction.is_internal) {
    return (
      <EditorCard title="Editar lançamento">
        <p className="text-muted-foreground text-sm">
          <span className="font-medium">
            {transaction.description ?? "Esta transação"}
          </span>{" "}
          é uma transação interna do sistema (Saldo Inicial) e não pode ser
          editada.
        </p>
        <Link
          href={
            transaction.account_id ? `/contas/${transaction.account_id}` : "/"
          }
          className="text-primary mt-3 inline-block text-sm hover:underline"
        >
          Voltar
        </Link>
      </EditorCard>
    )
  }

  if (transaction.type === "transferencia") {
    return <TransferEditor transactionId={id} />
  }

  return (
    <EditorCard title="Editar lançamento">
      <TransactionForm
        initial={{
          id: transaction.id,
          accountId: transaction.account_id!,
          categoryId: transaction.category_id!,
          type: transaction.type as "despesa" | "receita",
          amount: transaction.amount,
          currency: transaction.currency as Currency,
          description: transaction.description,
          occurredAt: transaction.occurred_at,
        }}
      />
    </EditorCard>
  )
}
