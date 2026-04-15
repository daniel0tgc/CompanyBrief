import { eq } from "drizzle-orm";
import { db } from "../client.js";
import { expansionCards } from "../schema.js";

export type ExpansionCard = typeof expansionCards.$inferSelect;

export const expansionCardsRepository = {
  async findByCompanyId(companyId: string): Promise<ExpansionCard[]> {
    return db
      .select()
      .from(expansionCards)
      .where(eq(expansionCards.companyId, companyId))
      .orderBy(expansionCards.createdAt);
  },

  async create(data: {
    companyId: string;
    sectionKey: string;
    question: string;
    content: string;
  }): Promise<ExpansionCard> {
    const rows = await db.insert(expansionCards).values(data).returning();
    return rows[0];
  },
};
