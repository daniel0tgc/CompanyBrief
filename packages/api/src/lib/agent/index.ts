import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import {
  detectProvider,
  resolveKey,
  getModels,
  makeAnthropicClient,
  makeOpenAIClient,
} from "../ai-client.js";
import { analysisTools, analysisToolsAnthropic } from "./tools.js";
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
const SYSTEM_PROMPT = readFileSync(join(__dirname, "ANALYSIS_CONTEXT.md"), "utf-8");

const SECTIONS = [
  "tagline", "what_they_do", "problem_solved", "ai_angle",
  "competitive_position", "competitors", "customers",
  "market_attractiveness", "disruption_risks", "future_outlook",
  "bull_case", "bear_case", "feedback",
] as const;

type SectionName = (typeof SECTIONS)[number];

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === "web_search") return tavilySearch(input.query as string);
  if (name === "search_news") {
    return tavilyNewsSearch(input.query as string, typeof input.days_back === "number" ? input.days_back : 90);
  }
  if (name === "scrape_url") return scrapeUrl(input.url as string);
  throw new Error(`Unknown tool: ${name}`);
}

function buildPrompt(section: SectionName, companyName: string) {
  return {
    system: `${SYSTEM_PROMPT}\n\nCurrent section: ${section}\nCompany: ${companyName}`,
    user: `Generate the "${section}" section of the analysis for the company: ${companyName}. Use the available tools to gather real data before producing the JSON output.`,
  };
}

function extractJson(text: string, section: SectionName): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON in response for ${section}: ${text.slice(0, 300)}`);
  return JSON.parse(text.slice(start, end + 1));
}

async function runSectionAnthropic(
  section: SectionName,
  companyName: string,
  emit: (e: AgentEvent) => void,
  client: Anthropic,
  model: string,
): Promise<unknown> {
  const { system, user } = buildPrompt(section, companyName);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];

  let response = await client.messages.create({ model, max_tokens: 4096, system, tools: analysisToolsAnthropic, messages });

  while (response.stop_reason === "tool_use") {
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) emit({ type: "thinking", payload: { text: block.text } });
      if (block.type === "tool_use") {
        const input = block.input as Record<string, unknown>;
        emit({ type: "tool_call", payload: { tool: block.name, input } });
        let result: string;
        try { result = await executeTool(block.name, input); }
        catch (err) { result = `Tool error: ${err instanceof Error ? err.message : String(err)}`; }
        emit({ type: "tool_result", payload: { tool: block.name, preview: result.slice(0, 200) } });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
    response = await client.messages.create({ model, max_tokens: 4096, system, tools: analysisToolsAnthropic, messages });
  }

  const lastText = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").at(-1)?.text ?? "";
  if (!lastText) throw new Error(`No text in final response for ${section}`);
  return extractJson(lastText, section);
}

async function runSectionOpenAI(
  section: SectionName,
  companyName: string,
  emit: (e: AgentEvent) => void,
  client: OpenAI,
  model: string,
): Promise<unknown> {
  const { system, user } = buildPrompt(section, companyName);
  type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
  const messages: Msg[] = [{ role: "system", content: system }, { role: "user", content: user }];

  let response = await client.chat.completions.create({ model, max_tokens: 4096, tools: analysisTools, tool_choice: "auto", messages });

  while (response.choices[0]?.finish_reason === "tool_calls") {
    const msg = response.choices[0].message;
    if (msg.content?.trim()) emit({ type: "thinking", payload: { text: msg.content } });
    const toolResults: Msg[] = [];
    for (const tc of msg.tool_calls ?? []) {
      if (tc.type !== "function") continue;
      const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      emit({ type: "tool_call", payload: { tool: tc.function.name, input } });
      let result: string;
      try { result = await executeTool(tc.function.name, input); }
      catch (err) { result = `Tool error: ${err instanceof Error ? err.message : String(err)}`; }
      emit({ type: "tool_result", payload: { tool: tc.function.name, preview: result.slice(0, 200) } });
      toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
    messages.push(msg);
    messages.push(...toolResults);
    response = await client.chat.completions.create({ model, max_tokens: 4096, tools: analysisTools, tool_choice: "auto", messages });
  }

  const finalText = response.choices[0]?.message.content ?? "";
  if (!finalText) throw new Error(`No text in final response for ${section}`);
  return extractJson(finalText, section);
}

export async function runAnalysisAgent(
  companyName: string,
  companyId: string,
  emit: (event: AgentEvent) => void,
  userApiKey?: string | null,
): Promise<CompanyAnalysis> {
  const key = resolveKey(userApiKey);
  const provider = detectProvider(key);
  const models = getModels(provider);

  const anthropicClient = provider === "anthropic" ? makeAnthropicClient(key) : null;
  const openaiClient = provider !== "anthropic" ? makeOpenAIClient(key, provider) : null;

  const partial: Partial<CompanyAnalysis> = {};

  for (const section of SECTIONS) {
    try {
      const data = provider === "anthropic"
        ? await runSectionAnthropic(section, companyName, emit, anthropicClient!, models.analysis)
        : await runSectionOpenAI(section, companyName, emit, openaiClient!, models.analysis);

      const d = data as Record<string, unknown>;
      if (section === "tagline") partial.tagline = d.tagline as string;
      else if (section === "what_they_do") partial.what_they_do = d.what_they_do as string[];
      else if (section === "problem_solved") partial.problem_solved = d.problem_solved as string[];
      else if (section === "ai_angle") partial.ai_angle = d.ai_angle as string[];
      else if (section === "competitive_position") partial.competitive_position = d.competitive_position as string[];
      else if (section === "competitors") partial.competitors = d.competitors as { name: string; notes: string }[];
      else if (section === "customers") partial.customers = d.customers as { category: string; examples: string[] }[];
      else if (section === "market_attractiveness") partial.market_attractiveness = d.market_attractiveness as string[];
      else if (section === "disruption_risks") partial.disruption_risks = d.disruption_risks as string[];
      else if (section === "future_outlook") partial.future_outlook = d.future_outlook as string[];
      else if (section === "bull_case") partial.bull_case = d.bull_case as string;
      else if (section === "bear_case") partial.bear_case = d.bear_case as string;
      else if (section === "feedback") partial.feedback = d.feedback as { pros: string[]; cons: string[]; source_url: string };

      emit({ type: "section_complete", payload: { section, data } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[agent] Section "${section}" failed for ${companyId}: ${message}`);
      emit({ type: "error", payload: { message: `Section ${section}: ${message}` } });
    }
  }

  return {
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
}
