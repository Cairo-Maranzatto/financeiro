"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { useSearch } from "@/features/search/hooks/use-search"

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function update(v: string) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebounced(v), ms)
  }

  return [debounced, update] as const
}

export function SearchBar() {
  const [raw, setRaw] = useState("")
  const [query, setDebounced] = useDebounce("", 300)
  const [open, setOpen] = useState(false)
  const { data } = useSearch(query)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setRaw(v)
    setDebounced(v)
    setOpen(v.trim().length >= 2)
  }

  const hasResults =
    data &&
    (data.transactions.length > 0 ||
      data.accounts.length > 0 ||
      data.goals.length > 0 ||
      data.loans.length > 0)

  return (
    <div className="relative">
      <input
        type="search"
        value={raw}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          if (raw.trim().length >= 2) setOpen(true)
        }}
        placeholder="Buscar…"
        className="placeholder:text-muted-foreground focus:ring-ring/50 h-8 w-44 rounded-md border bg-transparent px-3 text-sm focus:ring-2 focus:outline-none sm:w-56"
      />

      {open && hasResults && (
        <div className="bg-popover absolute top-10 right-0 z-50 w-72 rounded-lg border shadow-md">
          {data!.accounts.length > 0 && (
            <section className="px-3 py-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Contas
              </p>
              {data!.accounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/contas/${acc.id}`}
                  onClick={() => {
                    setOpen(false)
                    setRaw("")
                  }}
                  className="hover:bg-accent flex items-center justify-between rounded px-1 py-1 text-sm"
                >
                  <span>{acc.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {acc.currency}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {data!.transactions.length > 0 && (
            <section className="border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Transações
              </p>
              {data!.transactions.map((tx) => (
                <Link
                  key={tx.id}
                  href={`/contas/${tx.account_id}`}
                  onClick={() => {
                    setOpen(false)
                    setRaw("")
                  }}
                  className="hover:bg-accent flex items-center justify-between rounded px-1 py-1 text-sm"
                >
                  <span className="truncate">
                    {tx.description ?? "(sem descrição)"}
                  </span>
                  <span
                    className={`ml-2 shrink-0 text-xs font-medium ${
                      tx.type === "receita"
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {Number(tx.amount).toFixed(2)}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {data!.goals.length > 0 && (
            <section className="border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Metas
              </p>
              {data!.goals.map((g) => (
                <Link
                  key={g.id}
                  href={`/metas/${g.id}`}
                  onClick={() => {
                    setOpen(false)
                    setRaw("")
                  }}
                  className="hover:bg-accent flex items-center justify-between rounded px-1 py-1 text-sm"
                >
                  <span>{g.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.status}
                  </span>
                </Link>
              ))}
            </section>
          )}

          {data!.loans.length > 0 && (
            <section className="border-t px-3 py-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">
                Empréstimos
              </p>
              {data!.loans.map((l) => (
                <Link
                  key={l.id}
                  href={`/emprestimos/${l.id}`}
                  onClick={() => {
                    setOpen(false)
                    setRaw("")
                  }}
                  className="hover:bg-accent flex items-center justify-between rounded px-1 py-1 text-sm"
                >
                  <span>{l.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {l.status}
                  </span>
                </Link>
              ))}
            </section>
          )}
        </div>
      )}

      {open && !hasResults && raw.trim().length >= 2 && (
        <div className="bg-popover absolute top-10 right-0 z-50 w-72 rounded-lg border px-4 py-3 shadow-md">
          <p className="text-muted-foreground text-sm">
            Nenhum resultado para &ldquo;{raw}&rdquo;.
          </p>
        </div>
      )}
    </div>
  )
}
