import { GoalAllocateForm } from "@/features/planning/components/goal-allocate-form"
import { GoalAllocationsList } from "@/features/planning/components/goal-allocations-list"

export default async function MetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Aportes da meta</h1>

      <div className="mb-8 rounded-xl border p-6">
        <h2 className="mb-4 text-base font-semibold">Novo aporte</h2>
        <GoalAllocateForm goalId={id} />
      </div>

      <GoalAllocationsList goalId={id} />
    </main>
  )
}
