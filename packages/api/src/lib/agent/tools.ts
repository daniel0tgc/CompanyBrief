import type OpenAI from "openai";

export const analysisTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for information about a company. Returns a markdown digest of top results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_url",
      description:
        "Fetch and parse a specific URL. Use for the company homepage, G2 reviews, Crunchbase, LinkedIn.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_news",
      description:
        "Search for recent news about the company. Returns recent coverage.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          days_back: {
            type: "number",
            description: "How many days back to search. Default 90.",
          },
        },
        required: ["query"],
      },
    },
  },
];
