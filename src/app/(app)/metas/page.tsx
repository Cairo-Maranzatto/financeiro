import Link from "next/link"

import { GoalList } from "@/features/planning/components/goal-list"

export default function MetasPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <Link
          href="/metas/nova"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          + Nova
        </Link>
      </div>
      <GoalList />
    </main>
  )
}
