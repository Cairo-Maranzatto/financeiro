"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Algo deu errado.</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            O erro foi registrado. Tente recarregar a página.
          </p>
          <button
            onClick={reset}
            className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
