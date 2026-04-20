import OpenAI from "openai";

export const ANALYSIS_MODEL = "llama-3.3-70b-versatile";
export const CHAT_MODEL = "llama-3.1-8b-instant";

export function makeGroqClient(userApiKey?: string | null): OpenAI {
  const apiKey = userApiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("No Groq API key available");
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}
