import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"
import { AccountList } from "@/features/accounts/components/account-list"

export default function ContasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Contas</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/transferencias/nova"
            className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
          >
            Transferir
          </Link>
          <Link href="/contas/nova" className={cn(buttonVariants(), "text-sm")}>
            Nova conta
          </Link>
        </div>
      </div>
      <AccountList />
    </div>
  )
}
