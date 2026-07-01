import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { RequestPasswordResetForm } from "@/features/identity/components/request-password-reset-form"

export default function RecuperarSenhaPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu e-mail para receber o link de redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RequestPasswordResetForm />
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
