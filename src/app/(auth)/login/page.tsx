import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { LoginForm } from "@/features/identity/components/login-form"

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta para continuar.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-muted-foreground text-center text-sm">
          Não tem uma conta?{" "}
          <Link
            href="/cadastro"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/recuperar-senha"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
