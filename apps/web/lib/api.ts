import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getRawToken(): Promise<string | null> {
  const session = await auth();
  if (!session) return null;
  const cookieStore = cookies();
  const token =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    null;
  return token;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getRawToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      message = (JSON.parse(body) as { error?: string }).error ?? body;
    } catch {}
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export type MeResponse = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function getMe(): Promise<MeResponse> {
  return apiClient<MeResponse>("/auth/me");
}

export type { CompanyListItem, Company } from "@/lib/types";
import type { CompanyListItem, Company } from "@/lib/types";

export async function getCompanies(): Promise<CompanyListItem[]> {
  const { companies } = await apiClient<{ companies: CompanyListItem[] }>(
    "/companies",
  );
  return companies;
}

export async function getCompany(id: string): Promise<Company> {
  const { company } = await apiClient<{ company: Company }>(
    `/companies/${id}`,
  );
  return company;
}

export async function createCompany(
  name: string,
): Promise<Company> {
  const { company } = await apiClient<{ company: Company }>("/companies", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiClient(`/companies/${id}`, { method: "DELETE" });
}
