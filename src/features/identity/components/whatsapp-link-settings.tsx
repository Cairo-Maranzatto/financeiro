"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"

type LinkResponse = {
  linked: boolean
  phoneNumber: string | null
  linkedAt: string | null
}

type WhatsappLinkSettingsProps = {
  prefillPhone: string
}

export function WhatsappLinkSettings({
  prefillPhone,
}: WhatsappLinkSettingsProps) {
  const [phoneNumber, setPhoneNumber] = useState(prefillPhone)
  const [currentLink, setCurrentLink] = useState<LinkResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadLink() {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/whatsapp/link", {
        method: "GET",
      })

      const body = await response.json().catch(() => null)
      if (!active) return

      if (!response.ok) {
        setError(body?.error ?? "Não foi possível carregar o vínculo atual.")
        setIsLoading(false)
        return
      }

      setCurrentLink(body)
      if (!prefillPhone && body?.phoneNumber) {
        setPhoneNumber(body.phoneNumber)
      }

      setIsLoading(false)
    }

    void loadLink()

    return () => {
      active = false
    }
  }, [prefillPhone])

  async function handleLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    const response = await fetch("/api/whatsapp/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber }),
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      setError(body?.error ?? "Não foi possível vincular o número.")
      setIsSaving(false)
      return
    }

    setCurrentLink({
      linked: true,
      phoneNumber: body?.phoneNumber ?? phoneNumber,
      linkedAt: new Date().toISOString(),
    })
    setPhoneNumber(body?.phoneNumber ?? phoneNumber)
    setSuccess("Número vinculado com sucesso.")
    setIsSaving(false)
  }

  async function handleUnlink() {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    const response = await fetch("/api/whatsapp/link", {
      method: "DELETE",
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      setError(body?.error ?? "Não foi possível remover o vínculo.")
      setIsDeleting(false)
      return
    }

    setCurrentLink({ linked: false, phoneNumber: null, linkedAt: null })
    setSuccess("Vínculo removido.")
    setIsDeleting(false)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp</CardTitle>
          <CardDescription>
            Vincule seu número para conversar com o assistente financeiro pelo
            WhatsApp.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLink} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="phone" className="text-sm font-medium">
                Número com DDI (ex: +5511999999999)
              </label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+5511999999999"
                disabled={isLoading || isSaving || isDeleting}
              />
            </div>

            {currentLink?.linked && currentLink.phoneNumber && (
              <p className="text-muted-foreground text-sm">
                Número atualmente vinculado: {currentLink.phoneNumber}
              </p>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || isSaving || isDeleting || !phoneNumber}
              >
                {isSaving ? "Salvando..." : "Vincular número"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  isLoading || isSaving || isDeleting || !currentLink?.linked
                }
                onClick={handleUnlink}
              >
                {isDeleting ? "Removendo..." : "Remover vínculo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
