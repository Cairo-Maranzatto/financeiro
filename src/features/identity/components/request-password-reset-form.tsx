"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { createClient } from "@/shared/supabase/client"
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/identity/domain/schemas"

export function RequestPasswordResetForm() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
  })

  async function onSubmit(values: RequestPasswordResetInput) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/atualizar-senha`,
    })
    // Mesma mensagem independente do e-mail existir ou não, para não vazar quais
    // e-mails estão cadastrados na base (enumeration).
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-muted-foreground text-sm">
        Se houver uma conta com este e-mail, enviamos um link para redefinir a
        senha.
      </p>
    )
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
    </form>
  )
}
