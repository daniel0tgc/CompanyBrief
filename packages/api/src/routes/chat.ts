import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyNextAuthToken } from "../plugins/auth.js";
import { companiesRepository } from "../db/repository/companies.js";
import { conversationsRepository, type Message } from "../db/repository/conversations.js";
import { expansionCardsRepository } from "../db/repository/expansionCards.js";
import { detectProvider, resolveKey, getModels, makeAnthropicClient, makeOpenAIClient } from "../lib/ai-client.js";

const chatSchema = z.object({
  question: z.string().min(1).max(500),
});

const SECTION_KEYS = [
  "tagline", "what_they_do", "problem_solved", "ai_angle",
  "competitive_position", "competitors", "customers",
  "market_attractiveness", "disruption_risks", "future_outlook",
  "bull_case", "bear_case", "feedback",
].join("|");

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    "/companies/:id/chat",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = chatSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.flatten() });
      }

      const company = await companiesRepository.findById(id);
      if (!company || company.userId !== request.user.id) {
        return reply.status(404).send({ error: "Not found" });
      }
      if (company.status !== "complete" || !company.analysis) {
        return reply.status(400).send({ error: "Analysis not ready" });
      }

      const { question } = result.data;
      const systemPrompt = `You are a research analyst with deep knowledge of ${company.name}. The full company analysis is below. Answer the question concisely and factually. Identify which analysis section your answer relates to most — return it as section_key in your response.

Analysis:
${JSON.stringify(company.analysis, null, 2)}

Respond ONLY with valid JSON in this exact format (no preamble, no markdown):
{ "section_key": "one of: ${SECTION_KEYS}", "answer": "your answer here" }`;

      const key = resolveKey(request.user.groqApiKey);
      const provider = detectProvider(key);
      const chatModel = getModels(provider).chat;

      let rawResponse: string;

      if (provider === "anthropic") {
        const client = makeAnthropicClient(key);
        const res = await client.messages.create({
          model: chatModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: question }],
        });
        rawResponse = (res.content.find((b) => b.type === "text") as { text: string } | undefined)?.text ?? "";
      } else {
        const client = makeOpenAIClient(key, provider);
        const res = await client.chat.completions.create({
          model: chatModel,
          max_tokens: 1024,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
        });
        rawResponse = res.choices[0]?.message.content ?? "";
      }

      if (!rawResponse.trim()) return reply.status(500).send({ error: "No response from agent" });

      const raw = rawResponse.trim();
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
        section_key: string;
        answer: string;
      };

      const expansionCard = await expansionCardsRepository.create({
        companyId: id,
        sectionKey: parsed.section_key,
        question,
        content: parsed.answer,
      });

      const existing = await conversationsRepository.findByCompanyId(id);
      const messages: Message[] = [
        ...((existing?.messages as Message[]) ?? []),
        { role: "user", content: question, createdAt: new Date().toISOString() },
        { role: "assistant", content: parsed.answer, createdAt: new Date().toISOString() },
      ];
      await conversationsRepository.upsert(id, messages);

      return reply.send({ expansionCard, message: parsed.answer });
    },
  );
}
