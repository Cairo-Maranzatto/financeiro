"use client"

import { useRouter } from "next/navigation"

import { GoalForm } from "@/features/planning/components/goal-form"

export default function NovaMetaPage() {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Nova meta</h1>
      <div className="rounded-xl border p-6">
        <GoalForm onSuccess={() => router.push("/metas")} />
      </div>
    </main>
  )
}
