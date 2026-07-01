"use client"

import { useRouter } from "next/navigation"

import { LoanForm } from "@/features/loans/components/loan-form"

export default function NovoEmprestimoPage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Novo empréstimo</h1>
      <div className="rounded-xl border p-6">
        <LoanForm onSuccess={(id) => router.push(`/emprestimos/${id}`)} />
      </div>
    </main>
  )
}
