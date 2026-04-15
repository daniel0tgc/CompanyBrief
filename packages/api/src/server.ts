import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { companiesRoutes } from "./routes/companies.js";
import { startAnalysisWorker } from "./jobs/analysis.job.js";

const PORT = Number(process.env.PORT) || 3001;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: appUrl,
    credentials: true,
  });

  await app.register(authPlugin);

  app.get("/health", async () => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(companiesRoutes);

  startAnalysisWorker();

  return app;
}

buildServer()
  .then((app) =>
    app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    }),
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
