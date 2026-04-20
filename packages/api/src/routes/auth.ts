import type { FastifyInstance } from "fastify";
import { verifyNextAuthToken } from "../plugins/auth.js";
import { z } from "zod";
import { usersRepository } from "../db/repository/users.js";

const patchMeSchema = z.object({
  groqApiKey: z.string().max(200).nullable(),
});

export async function authRoutes(app: FastifyInstance) {
  app.get(
    "/auth/me",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const user = await usersRepository.findById(request.user.id);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        hasGroqApiKey: !!user.groqApiKey,
      });
    },
  );

  app.patch(
    "/auth/me",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const result = patchMeSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: result.error.flatten() });
      }
      await usersRepository.updateApiKey(request.user.id, result.data.groqApiKey);
      return reply.send({ ok: true });
    },
  );
}
