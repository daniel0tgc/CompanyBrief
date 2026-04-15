import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { users } from "../schema.js";

export type User = typeof users.$inferSelect;

export const usersRepository = {
  async findById(id: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);
    return rows[0] ?? null;
  },

  async findOrCreate(data: {
    email: string;
    googleId: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }): Promise<User> {
    if (data.googleId) {
      const existing = await usersRepository.findByGoogleId(data.googleId);
      if (existing) return existing;
    }

    const inserted = await db
      .insert(users)
      .values({
        email: data.email,
        googleId: data.googleId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          googleId: data.googleId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        },
      })
      .returning();

    return inserted[0];
  },
};
