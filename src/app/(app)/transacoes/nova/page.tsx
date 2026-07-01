import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { TransactionForm } from "@/features/transactions/components/transaction-form"

export default async function NovaTransacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>
}) {
  const { accountId } = await searchParams

  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm defaultAccountId={accountId} />
        </CardContent>
      </Card>
    </div>
  )
}
