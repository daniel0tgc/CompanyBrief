"use server";

import { redirect } from "next/navigation";
import { apiClient, ApiError } from "./api";
import type { Company, ExpansionCard } from "./types";

export type CreateCompanyState = {
  error: string | null;
};

export async function createCompanyAction(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) {
    return { error: "Please enter a company name." };
  }

  let company: Company;
  try {
    const result = await apiClient<{ company: Company }>("/companies", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    company = result.company;
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return { error: "Session expired. Please sign in again." };
      }
      return { error: `Could not create company: ${err.message}` };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Unexpected error: ${message}` };
  }

  redirect(`/company/${company.id}`);
}

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

export async function saveApiKey(
  groqApiKey: string | null,
): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ groqApiKey }),
  });
}
