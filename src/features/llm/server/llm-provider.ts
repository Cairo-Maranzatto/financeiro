import { google } from "@ai-sdk/google"
import { groq } from "@ai-sdk/groq"
import { type LanguageModel } from "ai"

type LlmProvider = "gemini" | "groq"

function resolveProvider(): LlmProvider {
  const env = process.env.LLM_PROVIDER?.toLowerCase()
  if (env === "groq") return "groq"
  if (env === "gemini") return "gemini"
  return "gemini"
}

function ensureGeminiApiKey(): void {
  if (
    !process.env.GEMINI_API_KEY &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    throw new Error(
      "Missing API key. Configure GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY."
    )
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
  }
}

function ensureGroqApiKey(): void {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing API key. Configure GROQ_API_KEY.")
  }
}

export function getLlmModel(): LanguageModel {
  const provider = resolveProvider()

  if (provider === "groq") {
    ensureGroqApiKey()
    return groq("llama3-groq-70b-8192-tool-use-preview")
  }

  ensureGeminiApiKey()
  return google("gemini-2.0-flash")
}
