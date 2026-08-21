"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { CategoryIcon } from "@/shared/ui/category-icon"
import { cn } from "@/shared/lib/utils"

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
  return (
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
                    className="hover:bg-muted/50 border-b transition-colors"
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
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
