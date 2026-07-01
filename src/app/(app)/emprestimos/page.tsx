import Link from "next/link"

import { LoanList } from "@/features/loans/components/loan-list"

export default function EmprestimosPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empréstimos</h1>
        <Link
          href="/emprestimos/novo"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          + Novo
        </Link>
      </div>
      <LoanList />
    </main>
  )
}
