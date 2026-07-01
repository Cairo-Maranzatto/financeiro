import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { AccountForm } from "@/features/accounts/components/account-form"

export default function NovaContaPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm />
        </CardContent>
      </Card>
    </div>
  )
}
