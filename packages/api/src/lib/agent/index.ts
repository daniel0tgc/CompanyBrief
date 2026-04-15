import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { analysisTools } from "./tools.js";
import { tavilySearch, tavilyNewsSearch } from "../tavily.js";
import { scrapeUrl } from "../scraper.js";
import type { CompanyAnalysis } from "../types.js";

export type AgentEvent =
  | { type: "thinking"; payload: { text: string } }
  | { type: "tool_call"; payload: { tool: string; input: unknown } }
  | { type: "tool_result"; payload: { tool: string; preview: string } }
  | { type: "section_complete"; payload: { section: string; data: unknown } }
  | { type: "error"; payload: { message: string } };

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = readFileSync(
  join(__dirname, "ANALYSIS_CONTEXT.md"),
  "utf-8",
);

const SECTIONS = [
  "tagline",
  "what_they_do",
  "problem_solved",
  "ai_angle",
  "competitive_position",
  "competitors",
  "customers",
  "market_attractiveness",
  "disruption_risks",
  "future_outlook",
  "bull_case",
  "bear_case",
  "feedback",
] as const;

type SectionName = (typeof SECTIONS)[number];

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  if (toolName === "web_search") {
    return tavilySearch(toolInput.query as string);
  }
  if (toolName === "search_news") {
    const daysBack =
      typeof toolInput.days_back === "number" ? toolInput.days_back : 90;
    return tavilyNewsSearch(toolInput.query as string, daysBack);
  }
  if (toolName === "scrape_url") {
    return scrapeUrl(toolInput.url as string);
  }
  throw new Error(`Unknown tool: ${toolName}`);
}

async function runSection(
  section: SectionName,
  companyName: string,
  emit: (event: AgentEvent) => void,
): Promise<unknown> {
  const systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent section: ${section}\nCompany: ${companyName}`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Generate the "${section}" section of the analysis for the company: ${companyName}. Follow the instructions in your system prompt exactly. Use the available tools to gather real data before producing the JSON output.`,
    },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    tools: analysisTools,
    messages,
  });

  while (response.stop_reason === "tool_use") {
    const assistantContent = response.content;
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of assistantContent) {
      if (block.type === "text" && block.text.trim()) {
        emit({ type: "thinking", payload: { text: block.text } });
      }

      if (block.type === "tool_use") {
        emit({
          type: "tool_call",
          payload: { tool: block.name, input: block.input },
        });

        let resultContent: string;
        try {
          resultContent = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
          );
        } catch (err) {
          resultContent = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
        }

        emit({
          type: "tool_result",
          payload: { tool: block.name, preview: resultContent.slice(0, 200) },
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: resultContent,
        });
      }
    }

    messages.push({ role: "assistant", content: assistantContent });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools: analysisTools,
      messages,
    });
  }

  const lastTextBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .at(-1);

  if (!lastTextBlock) {
    throw new Error(`No text block in final response for section: ${section}`);
  }

  const raw = lastTextBlock.text.trim();

  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(
      `No JSON found in response for section ${section}: ${raw.slice(0, 300)}`,
    );
  }

  return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
}

export async function runAnalysisAgent(
  companyName: string,
  companyId: string,
  emit: (event: AgentEvent) => void,
): Promise<CompanyAnalysis> {
  const partial: Partial<CompanyAnalysis> = {};

  for (const section of SECTIONS) {
    try {
      const data = await runSection(section, companyName, emit);
      const sectionData = data as Record<string, unknown>;

      if (section === "tagline") {
        partial.tagline = sectionData.tagline as string;
      } else if (section === "what_they_do") {
        partial.what_they_do = sectionData.what_they_do as string[];
      } else if (section === "problem_solved") {
        partial.problem_solved = sectionData.problem_solved as string[];
      } else if (section === "ai_angle") {
        partial.ai_angle = sectionData.ai_angle as string[];
      } else if (section === "competitive_position") {
        partial.competitive_position =
          sectionData.competitive_position as string[];
      } else if (section === "competitors") {
        partial.competitors = sectionData.competitors as {
          name: string;
          notes: string;
        }[];
      } else if (section === "customers") {
        partial.customers = sectionData.customers as {
          category: string;
          examples: string[];
        }[];
      } else if (section === "market_attractiveness") {
        partial.market_attractiveness =
          sectionData.market_attractiveness as string[];
      } else if (section === "disruption_risks") {
        partial.disruption_risks = sectionData.disruption_risks as string[];
      } else if (section === "future_outlook") {
        partial.future_outlook = sectionData.future_outlook as string[];
      } else if (section === "bull_case") {
        partial.bull_case = sectionData.bull_case as string;
      } else if (section === "bear_case") {
        partial.bear_case = sectionData.bear_case as string;
      } else if (section === "feedback") {
        partial.feedback = sectionData.feedback as {
          pros: string[];
          cons: string[];
          source_url: string;
        };
      }

      emit({ type: "section_complete", payload: { section, data } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[agent] Section "${section}" failed for ${companyId}: ${message}`);
      emit({ type: "error", payload: { message: `Section ${section}: ${message}` } });
    }
  }

  const analysis: CompanyAnalysis = {
    tagline: partial.tagline ?? "",
    what_they_do: partial.what_they_do ?? [],
    problem_solved: partial.problem_solved ?? [],
    ai_angle: partial.ai_angle ?? [],
    competitive_position: partial.competitive_position ?? [],
    competitors: partial.competitors ?? [],
    customers: partial.customers ?? [],
    market_attractiveness: partial.market_attractiveness ?? [],
    disruption_risks: partial.disruption_risks ?? [],
    future_outlook: partial.future_outlook ?? [],
    bull_case: partial.bull_case ?? "",
    bear_case: partial.bear_case ?? "",
    feedback: partial.feedback ?? { pros: [], cons: [], source_url: "" },
    doc_url: "",
  };

  return analysis;
}
