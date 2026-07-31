// AÇÃO TEMPORÁRIA: cadastro e recuperação de senha desativados.
// Reative os links abaixo quando o produto estiver aberto ao público.
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
      </CardContent>
    </Card>
  )
}
