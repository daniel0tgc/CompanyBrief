import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { companiesRepository } from "../db/repository/companies.js";
import type { CompanyAnalysis } from "../lib/types.js";

const PLACEHOLDER_ANALYSIS: CompanyAnalysis = {
  tagline: "Stub analysis — real agent runs in Phase 4.",
  what_they_do: ["Placeholder bullet"],
  problem_solved: ["Placeholder bullet"],
  ai_angle: ["Placeholder bullet"],
  competitive_position: ["Placeholder bullet"],
  competitors: [{ name: "Competitor A", notes: "Placeholder notes." }],
  customers: [{ category: "Enterprise", examples: ["Acme Corp"] }],
  market_attractiveness: ["Placeholder bullet"],
  disruption_risks: ["Placeholder bullet"],
  future_outlook: ["Placeholder bullet"],
  bull_case: "Placeholder bull case.",
  bear_case: "Placeholder bear case.",
  feedback: { pros: ["Fast"], cons: ["Expensive"], source_url: "" },
  doc_url: "",
};

export function startAnalysisWorker() {
  const worker = new Worker(
    "analysis",
    async (job) => {
      const { companyId, companyName } = job.data as {
        companyId: string;
        companyName: string;
      };

      console.log(`Starting analysis for ${companyName}`);

      await companiesRepository.updateStatus(companyId, "running");

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await companiesRepository.updateStatus(
        companyId,
        "complete",
        PLACEHOLDER_ANALYSIS,
      );

      console.log(`Analysis complete for ${companyName}`);
    },
    { connection: redis },
  );

  worker.on("failed", async (job, err) => {
    if (job) {
      const { companyId } = job.data as { companyId: string };
      await companiesRepository.updateError(companyId, err.message);
    }
    console.error("Analysis job failed:", err);
  });

  return worker;
}
