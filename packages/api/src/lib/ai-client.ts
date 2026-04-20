import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type ProviderType = "anthropic" | "groq" | "openai";

export function detectProvider(key: string): ProviderType {
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("gsk_")) return "groq";
  return "openai";
}

export function resolveKey(userKey?: string | null): string {
  const key = userKey ?? process.env.GROQ_API_KEY ?? "";
  if (!key) throw new Error("No AI API key configured");
  return key;
}

export function getModels(provider: ProviderType) {
  return {
    anthropic: { analysis: "claude-3-5-sonnet-20241022", chat: "claude-3-5-haiku-20241022" },
    groq: { analysis: "llama-3.3-70b-versatile", chat: "llama-3.1-8b-instant" },
    openai: { analysis: "gpt-4o-mini", chat: "gpt-4o-mini" },
  }[provider];
}

export function makeAnthropicClient(key: string): Anthropic {
  return new Anthropic({ apiKey: key });
}

export function makeOpenAIClient(key: string, provider: "groq" | "openai"): OpenAI {
  return new OpenAI({
    apiKey: key,
    baseURL: provider === "groq" ? "https://api.groq.com/openai/v1" : undefined,
  });
}
