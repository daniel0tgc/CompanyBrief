import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyNextAuthToken } from "../plugins/auth.js";
import { companiesRepository } from "../db/repository/companies.js";
import { analysisQueue } from "../lib/queue.js";
import { subscribeToAnalysis } from "../lib/redis-pubsub.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function companiesRoutes(app: FastifyInstance) {
  app.get(
    "/companies",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const companies = await companiesRepository.findAllByUser(
        request.user.id,
      );
      return reply.send({ companies });
    },
  );

  app.post(
    "/companies",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const result = createCompanySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.flatten() });
      }

      const { name } = result.data;
      const slug = slugify(name);

      const company = await companiesRepository.create({
        userId: request.user.id,
        name,
        slug,
      });

      await analysisQueue.add("analyse", {
        companyId: company.id,
        companyName: company.name,
      });

      return reply.status(201).send({ company });
    },
  );

  app.get(
    "/companies/:id",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const company = await companiesRepository.findById(id);
      if (!company || company.userId !== request.user.id) {
        return reply.status(404).send({ error: "Not found" });
      }
      return reply.send({ company });
    },
  );

  app.delete(
    "/companies/:id",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const company = await companiesRepository.findById(id);
      if (!company || company.userId !== request.user.id) {
        return reply.status(404).send({ error: "Not found" });
      }
      await companiesRepository.deleteById(id);
      return reply.status(204).send();
    },
  );

  app.get(
    "/companies/:id/stream",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const company = await companiesRepository.findById(id);
      if (!company || company.userId !== request.user.id) {
        return reply.status(404).send({ error: "Not found" });
      }

      reply.hijack();
      const raw = reply.raw;
      raw.setHeader("Content-Type", "text/event-stream");
      raw.setHeader("Cache-Control", "no-cache");
      raw.setHeader("Connection", "keep-alive");
      raw.setHeader("X-Accel-Buffering", "no");

      function send(event: unknown): void {
        if (!raw.destroyed) {
          raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      }

      if (company.status === "complete") {
        send({ type: "replay", payload: company.analysis });
        raw.end();
        return;
      }

      if (company.status === "error") {
        send({ type: "error", payload: { message: company.errorMessage } });
        raw.end();
        return;
      }

      const unsub = await subscribeToAnalysis(id, (event) => send(event));

      await new Promise<void>((resolve) => {
        request.raw.on("close", () => {
          unsub().catch(console.error);
          resolve();
        });
      });
    },
  );
}
