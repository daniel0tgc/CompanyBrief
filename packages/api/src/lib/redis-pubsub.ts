import { Redis as IORedis } from "ioredis";
import type { AgentEvent } from "./agent/index.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function makeRedisClient(): IORedis {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
}

const publisher = makeRedisClient();

export function channelFor(companyId: string): string {
  return `analysis:${companyId}`;
}

export async function publishAgentEvent(
  companyId: string,
  event: AgentEvent,
): Promise<void> {
  await publisher.publish(channelFor(companyId), JSON.stringify(event));
}

export async function subscribeToAnalysis(
  companyId: string,
  onEvent: (event: AgentEvent) => void,
): Promise<() => Promise<void>> {
  const subscriber = makeRedisClient();
  const channel = channelFor(companyId);

  await subscriber.subscribe(channel);

  subscriber.on("message", (_ch: string, message: string) => {
    try {
      const event = JSON.parse(message) as AgentEvent;
      onEvent(event);
    } catch {
      // malformed message — ignore
    }
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}
