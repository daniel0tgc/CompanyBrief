const TAVILY_BASE = "https://api.tavily.com";
const MAX_CHARS = 8000;

class TavilyError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TavilyError";
  }
}

function buildDigest(results: TavilyResult[]): string {
  return results
    .map((r) => `## ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n")
    .slice(0, MAX_CHARS);
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface TavilySearchResponse {
  results: TavilyResult[];
}

async function tavilyPost(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new TavilyError("TAVILY_API_KEY not set", 500);

  const res = await fetch(`${TAVILY_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, ...body }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TavilyError(`Tavily ${endpoint} failed: ${text}`, res.status);
  }

  return res.json() as Promise<TavilySearchResponse>;
}

export async function tavilySearch(query: string): Promise<string> {
  const data = await tavilyPost("/search", {
    query,
    search_depth: "advanced",
    max_results: 5,
  });
  return buildDigest(data.results);
}

export async function tavilyNewsSearch(
  query: string,
  daysBack = 90,
): Promise<string> {
  const data = await tavilyPost("/search", {
    query,
    search_depth: "advanced",
    topic: "news",
    days: daysBack,
    max_results: 5,
  });
  return buildDigest(data.results);
}

export async function tavilyExtract(url: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new TavilyError("TAVILY_API_KEY not set", 500);

  const res = await fetch(`${TAVILY_BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, urls: [url] }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TavilyError(`Tavily extract failed: ${text}`, res.status);
  }

  const data = (await res.json()) as {
    results?: { raw_content?: string }[];
  };

  const content = data.results?.[0]?.raw_content ?? "";
  return content.slice(0, MAX_CHARS);
}
