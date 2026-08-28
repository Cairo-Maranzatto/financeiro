"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { CategoryIcon } from "@/shared/ui/category-icon"
import { cn } from "@/shared/lib/utils"
import { TransactionEditModal } from "@/features/transactions/components/transaction-edit-modal"

interface Transaction {
  id: string
  amount: number
  currency: string
  type: string
  status: string
  description: string | null
  occurred_at: string
  categories: { name: string; icon: string | null } | null
  accounts: { name: string } | null
}

interface ReportTransactionListProps {
  transactions: Transaction[]
  title?: string
}

export function ReportTransactionList({
  transactions,
  title = "Transações do Período",
}: ReportTransactionListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="px-2 py-3 text-left font-medium">Data</th>
                  <th className="px-2 py-3 text-left font-medium">Descrição</th>
                  <th className="px-2 py-3 text-left font-medium">Conta</th>
                  <th className="px-2 py-3 text-left font-medium">Categoria</th>
                  <th className="px-2 py-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground py-8 text-center"
                    >
                      Nenhuma transação encontrada no período.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => {
                        setEditingId(tx.id)
                        setIsOpen(true)
                      }}
                      className="hover:bg-muted/50 cursor-pointer border-b transition-colors"
                    >
                      <td className="px-2 py-3 whitespace-nowrap">
                        {new Date(tx.occurred_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-2 py-3 font-medium">
                        {tx.description || "Sem descrição"}
                        {tx.status === "Pendente" && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800 uppercase">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground px-2 py-3">
                        {tx.accounts?.name || "-"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          {tx.categories?.icon && (
                            <CategoryIcon
                              icon={tx.categories.icon}
                              className="text-muted-foreground size-4"
                            />
                          )}
                          <span>{tx.categories?.name || "Sem categoria"}</span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-2 py-3 text-right font-bold whitespace-nowrap",
                          tx.type === "receita"
                            ? "text-green-600"
                            : tx.type === "despesa"
                              ? "text-red-600"
                              : "text-foreground"
                        )}
                      >
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: tx.currency,
                        }).format(tx.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot>
                  {Array.from(
                    new Set(transactions.map((tx) => tx.currency))
                  ).map((currency) => {
                    const total = transactions
                      .filter((tx) => tx.currency === currency)
                      .reduce((acc, tx) => acc + tx.amount, 0)
                    return (
                      <tr key={currency} className="bg-muted/30 font-bold">
                        <td colSpan={4} className="px-2 py-3 text-right">
                          Total {currency}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-3 text-right whitespace-nowrap",
                            total >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: currency,
                          }).format(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <TransactionEditModal
        transactionId={editingId}
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setEditingId(null)
        }}
      />
    </>
  )
}
