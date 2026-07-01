"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/shared/ui/button"
import { createClient } from "@/shared/supabase/client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sair
    </Button>
  )
}
