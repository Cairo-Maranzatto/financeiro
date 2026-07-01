"use client"

import { useQuery } from "@tanstack/react-query"

export type SearchResults = {
  transactions: {
    id: string
    description: string | null
    amount: number
    currency: string
    type: string
    occurred_at: string
    account_id: string
    categories: { name: string } | null
  }[]
  accounts: { id: string; name: string; currency: string }[]
  goals: {
    id: string
    name: string
    target_amount: number
    currency: string
    status: string
  }[]
  loans: { id: string; name: string; status: string; currency: string }[]
}

async function fetchSearch(q: string): Promise<SearchResults> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error("Erro na busca.")
  return res.json()
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => fetchSearch(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })
}
