import type { FastifyInstance } from "fastify";
import { verifyNextAuthToken } from "../plugins/auth.js";
import { z } from "zod";

export async function authRoutes(app: FastifyInstance) {
  app.get(
    "/auth/me",
    { preHandler: [verifyNextAuthToken] },
    async (request, reply) => {
      const { id, email } = request.user;
      const { usersRepository } = await import(
        "../db/repository/users.js"
      );
      const user = await usersRepository.findById(id);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    },
  );
}
