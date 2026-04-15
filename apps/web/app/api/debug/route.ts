import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "(not set — defaulting to localhost:3001)";

  let apiReachable = false;
  let healthData: unknown = null;
  let healthError: string | null = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/health`,
      { cache: "no-store" },
    );
    apiReachable = res.ok;
    healthData = await res.json();
  } catch (err) {
    healthError = err instanceof Error ? err.message : String(err);
  }

  const cookieStore = cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);
  const hasAuthCookie = cookieNames.some(
    (n) =>
      n === "authjs.session-token" ||
      n === "__Secure-authjs.session-token" ||
      n === "next-auth.session-token" ||
      n === "__Secure-next-auth.session-token",
  );

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_API_URL: apiUrl,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "(not set)",
      HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    },
    api: {
      reachable: apiReachable,
      health: healthData,
      error: healthError,
    },
    auth: {
      cookiesPresent: cookieNames,
      hasAuthCookie,
    },
  });
}
