import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import {
  jwtDecrypt,
  calculateJwkThumbprint,
  base64url,
  type JWEHeaderParameters,
} from "jose";
import { hkdfSync } from "crypto";
import { usersRepository } from "../db/repository/users.js";

type ReqUser = { id: string; email: string; groqApiKey: string | null };

declare module "fastify" {
  interface FastifyRequest {
    user: ReqUser;
  }
}

// All possible Auth.js v5 session cookie names (production HTTPS first, then HTTP dev)
const SESSION_COOKIE_SALTS = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

// Replicates Auth.js v5 getDerivedEncryptionKey — HKDF-SHA-256 with cookie name as salt
function deriveKey(enc: string, secret: string, salt: string): Uint8Array {
  const length = enc === "A256CBC-HS512" ? 64 : 32;
  return new Uint8Array(
    hkdfSync(
      "sha256",
      secret,
      salt,
      `Auth.js Generated Encryption Key (${salt})`,
      length,
    ),
  );
}

async function decodeNextAuthToken(
  rawToken: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtDecrypt(
      rawToken,
      async (header: JWEHeaderParameters) => {
        const enc = (header.enc as string) ?? "A256CBC-HS512";
        for (const salt of SESSION_COOKIE_SALTS) {
          const key = deriveKey(enc, secret, salt);
          if (!header.kid) return key;
          // 64-byte key → sha512, 32-byte key → sha256
          const hashAlg = key.byteLength === 64 ? "sha512" : "sha256";
          const thumbprint = await calculateJwkThumbprint(
            { kty: "oct", k: base64url.encode(key) },
            hashAlg,
          );
          if (header.kid === thumbprint) return key;
        }
        throw new Error("no matching decryption secret");
      },
      {
        clockTolerance: 15,
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
      },
    );
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

  request.user = { id: user.id, email: user.email, groqApiKey: user.groqApiKey ?? null };
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("verifyNextAuthToken", verifyNextAuthToken);
  app.addHook("onRequest", async () => {});
};

export default fp(authPlugin);
export { verifyNextAuthToken };
