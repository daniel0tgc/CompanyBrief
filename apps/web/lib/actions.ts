"use server";

import { apiClient } from "./api";
import type { ExpansionCard } from "./types";

export async function sendChatMessage(
  companyId: string,
  question: string,
): Promise<{ expansionCard: ExpansionCard; message: string }> {
  return apiClient<{ expansionCard: ExpansionCard; message: string }>(
    `/companies/${companyId}/chat`,
    {
      method: "POST",
      body: JSON.stringify({ question }),
    },
  );
}
