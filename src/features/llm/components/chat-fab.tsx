"use client"

import { useState } from "react"
import { BotMessageSquare } from "lucide-react"

import { ChatSidebar } from "@/features/llm/components/chat-sidebar"
import { Button } from "@/shared/ui/button"

export function ChatFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        className="fixed right-6 bottom-6 z-30 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente financeiro"
      >
        <BotMessageSquare className="size-5" />
      </Button>

      <ChatSidebar open={open} onClose={() => setOpen(false)} />
    </>
  )
}
