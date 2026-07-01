import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { TransferForm } from "@/features/transactions/components/transfer-form"

export default function NovaTransferenciaPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Transferência entre contas</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferForm />
        </CardContent>
      </Card>
    </div>
  )
}
