"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Loader2, X } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { cn } from "@/shared/lib/utils"

type ChatSidebarProps = {
  open: boolean
  onClose: () => void
}

type MessageLike = {
  id: string
  role: string
  content?: string
  parts?: unknown[]
}

function formatMessageText(message: MessageLike) {
  if (
    typeof message.content === "string" &&
    message.content.trim().length > 0
  ) {
    return message.content
  }

  if (!Array.isArray(message.parts)) return ""

  return message.parts
    .map((part) => {
      if (!part || typeof part !== "object") return ""

      const maybePart = part as {
        type?: string
        text?: string
        state?: string
        result?: unknown
        output?: unknown
      }
      if (maybePart.type === "text" && typeof maybePart.text === "string") {
        return maybePart.text
      }

      if (
        maybePart.type === "tool-output-available" ||
        maybePart.type === "tool-result"
      ) {
        const resultData = maybePart.output ?? maybePart.result
        if (resultData) {
          return typeof resultData === "string"
            ? resultData
            : JSON.stringify(resultData, null, 2)
        }
      }

      if (
        typeof maybePart.type === "string" &&
        maybePart.type.startsWith("tool-")
      ) {
        const toolName = maybePart.type.replace("tool-", "")
        const suffix = maybePart.state ? ` (${maybePart.state})` : ""
        return `Executando ${toolName}${suffix}...`
      }

      return ""
    })
    .filter(Boolean)
    .join("\n")
}

export function ChatSidebar({ open, onClose }: ChatSidebarProps) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        context: {
          pathname,
        },
      },
    }),
  })

  const busy = status === "submitted" || status === "streaming"

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const messagesWithText = useMemo(
    () =>
      messages.map((message: MessageLike) => ({
        ...message,
        renderedText: formatMessageText(message),
      })),
    [messages]
  )

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Assistente financeiro"
        className={cn(
          "bg-background fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Assistente Financeiro</p>
            <p className="text-muted-foreground text-xs">
              Gemini + dados reais da conta
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Fechar chat"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messagesWithText.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
              Pergunte algo como &ldquo;qual meu saldo hoje?&rdquo; ou
              &ldquo;quais categorias mais gastei neste mês?&rdquo;
            </div>
          ) : null}

          {messagesWithText.map(
            (message: MessageLike & { renderedText: string }) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted text-foreground"
                )}
              >
                {message.renderedText || "..."}
              </div>
            )
          )}

          {busy ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              Consultando dados...
            </div>
          ) : null}

          {error ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-2 text-xs">
              Não foi possível concluir a resposta agora.
            </div>
          ) : null}
        </div>

        <form
          className="flex items-center gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = inputValue.trim()
            if (!trimmed || busy) return

            void sendMessage({ text: trimmed })
            setInputValue("")
          }}
        >
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={busy}
          />
          <Button
            type="submit"
            disabled={busy || inputValue.trim().length === 0}
          >
            Enviar
          </Button>
          {messages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMessages([])}
              disabled={busy}
            >
              Limpar
            </Button>
          ) : null}
        </form>
      </aside>
    </>
  )
}
