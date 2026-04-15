import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { companiesRepository } from "../db/repository/companies.js";
import { runAnalysisAgent, type AgentEvent } from "../lib/agent/index.js";
import { publishAgentEvent } from "../lib/redis-pubsub.js";

function makeEmitter(companyId: string) {
  return function emit(event: AgentEvent): void {
    publishAgentEvent(companyId, event).catch((err: unknown) =>
      console.error(`[analysis.job] publish error for ${companyId}:`, err),
    );
  };
}

export function startAnalysisWorker() {
  const worker = new Worker(
    "analysis",
    async (job) => {
      const { companyId, companyName } = job.data as {
        companyId: string;
        companyName: string;
      };

      console.log(`[analysis.job] Starting agent for "${companyName}" (${companyId})`);

      await companiesRepository.updateStatus(companyId, "running");

      const emit = makeEmitter(companyId);

      try {
        const analysis = await runAnalysisAgent(companyName, companyId, emit);
        await companiesRepository.updateStatus(companyId, "complete", analysis);
        console.log(`[analysis.job] Agent complete for "${companyName}" (${companyId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[analysis.job] Agent failed for "${companyName}":`, message);
        emit({ type: "error", payload: { message } });
        await companiesRepository.updateError(companyId, message);
      }
    },
    { connection: redis },
  );

  worker.on("failed", async (job, err) => {
    if (job) {
      const { companyId } = job.data as { companyId: string };
      await companiesRepository
        .updateError(companyId, err.message)
        .catch(() => {});
    }
    console.error("[analysis.job] BullMQ job failed:", err);
  });

  return worker;
}
