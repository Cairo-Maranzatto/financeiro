import Link from "next/link"

import { SignOutButton } from "@/features/identity/components/sign-out-button"
import { SearchBar } from "@/features/search/components/search-bar"

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-lg font-semibold">
          Financeiro
        </Link>
        <nav className="text-muted-foreground flex gap-4 text-sm">
          <Link href="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/contas" className="hover:text-foreground">
            Contas
          </Link>
          <Link href="/cartoes" className="hover:text-foreground">
            Cartões
          </Link>
          <Link href="/planejamento" className="hover:text-foreground">
            Planejamento
          </Link>
          <Link href="/metas" className="hover:text-foreground">
            Metas
          </Link>
          <Link href="/emprestimos" className="hover:text-foreground">
            Empréstimos
          </Link>
          <Link href="/categorias" className="hover:text-foreground">
            Categorias
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <SearchBar />
        <SignOutButton />
      </div>
    </header>
  )
}
