import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { CreditCardForm } from "@/features/credit-cards/components/credit-card-form"

export default function NovoCartaoPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Novo cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditCardForm />
        </CardContent>
      </Card>
    </div>
  )
}
