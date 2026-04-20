import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";

const toolDefinitions = [
  {
    name: "web_search",
    description:
      "Search the web for information about a company. Returns a markdown digest of top results.",
    parameters: {
      type: "object" as const,
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
  {
    name: "scrape_url",
    description:
      "Fetch and parse a specific URL. Use for the company homepage, G2 reviews, Crunchbase, LinkedIn.",
    parameters: {
      type: "object" as const,
      properties: { url: { type: "string", description: "The full URL to fetch" } },
      required: ["url"],
    },
  },
  {
    name: "search_news",
    description: "Search for recent news about the company. Returns recent coverage.",
    parameters: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        days_back: { type: "number", description: "How many days back to search. Default 90." },
      },
      required: ["query"],
    },
  },
];

export const analysisTools: OpenAI.Chat.Completions.ChatCompletionTool[] =
  toolDefinitions.map((t) => ({ type: "function", function: t }));

export const analysisToolsAnthropic: Anthropic.Tool[] = toolDefinitions.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters as Anthropic.Tool["input_schema"],
}));
