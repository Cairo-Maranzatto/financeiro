import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { AccountList } from "@/features/accounts/components/account-list"

export default function ContasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Contas</h1>
        <Link href="/contas/nova" className={cn(buttonVariants())}>
          Nova conta
        </Link>
      </div>
      <AccountList />
    </div>
  )
}
