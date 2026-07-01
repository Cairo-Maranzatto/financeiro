import { LoanDetail } from "@/features/loans/components/loan-detail"

export default async function EmprestimoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Detalhes do empréstimo</h1>
      <LoanDetail id={id} />
    </main>
  )
}
