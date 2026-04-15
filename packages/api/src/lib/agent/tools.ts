import type Anthropic from "@anthropic-ai/sdk";

export const analysisTools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description:
      "Search the web for information about a company. Returns a markdown digest of top results.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "scrape_url",
    description:
      "Fetch and parse a specific URL. Use for the company homepage, G2 reviews, Crunchbase, LinkedIn.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_news",
    description:
      "Search for recent news about the company. Returns recent coverage.",
    input_schema: {
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
];
