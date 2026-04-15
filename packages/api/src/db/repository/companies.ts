import { eq, sql } from "drizzle-orm";
import { db } from "../client.js";
import { companies } from "../schema.js";
import type { CompanyAnalysis } from "../../lib/types.js";

export type Company = typeof companies.$inferSelect;
export type CompanyListItem = Omit<Company, "analysis">;

export const companiesRepository = {
  async create(data: {
    userId: string;
    name: string;
    slug: string;
  }): Promise<Company> {
    const rows = await db.insert(companies).values(data).returning();
    return rows[0];
  },

  async findById(id: string): Promise<Company | null> {
    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findAllByUser(userId: string): Promise<CompanyListItem[]> {
    const rows = await db
      .select({
        id: companies.id,
        userId: companies.userId,
        name: companies.name,
        slug: companies.slug,
        status: companies.status,
        errorMessage: companies.errorMessage,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companies)
      .where(eq(companies.userId, userId))
      .orderBy(sql`${companies.createdAt} DESC`);
    return rows;
  },

  async updateStatus(
    id: string,
    status: string,
    analysis?: CompanyAnalysis,
  ): Promise<void> {
    await db
      .update(companies)
      .set({
        status,
        ...(analysis !== undefined ? { analysis } : {}),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id));
  },

  async updateError(id: string, message: string): Promise<void> {
    await db
      .update(companies)
      .set({ status: "error", errorMessage: message, updatedAt: new Date() })
      .where(eq(companies.id, id));
  },

  async deleteById(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  },
};
