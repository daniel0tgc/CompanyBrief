import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { conversations } from "../schema.js";

export type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Conversation = typeof conversations.$inferSelect;

export const conversationsRepository = {
  async findByCompanyId(companyId: string): Promise<Conversation | null> {
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.companyId, companyId))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsert(companyId: string, messages: Message[]): Promise<Conversation> {
    const rows = await db
      .insert(conversations)
      .values({ companyId, messages })
      .onConflictDoUpdate({
        target: conversations.companyId,
        set: { messages, updatedAt: new Date() },
      })
      .returning();
    return rows[0];
  },
};
