import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { jwtDecrypt } from "jose";
import { createHash } from "crypto";
import { usersRepository } from "../db/repository/users.js";

type ReqUser = { id: string; email: string };

declare module "fastify" {
  interface FastifyRequest {
    user: ReqUser;
  }
}

function deriveKey(secret: string): Uint8Array {
  return new Uint8Array(
    createHash("sha256").update(secret).digest(),
  );
}

async function decodeNextAuthToken(
  rawToken: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const key = deriveKey(secret);
    const { payload } = await jwtDecrypt(rawToken, key);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function verifyNextAuthToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  const queryToken = (request.query as Record<string, string>)?.token;
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : queryToken;

  if (!rawToken) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return reply.status(500).send({ error: "Server misconfiguration" });
  }

  const payload = await decodeNextAuthToken(rawToken, secret);
  if (!payload || typeof payload.email !== "string") {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const user = await usersRepository.findOrCreate({
    email: payload.email,
    googleId: typeof payload.googleId === "string" ? payload.googleId : null,
    displayName: typeof payload.name === "string" ? payload.name : null,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
  });

  request.user = { id: user.id, email: user.email };
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("verifyNextAuthToken", verifyNextAuthToken);
  app.addHook("onRequest", async () => {});
};

export default fp(authPlugin);
export { verifyNextAuthToken };
