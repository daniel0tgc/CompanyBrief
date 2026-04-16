import { redirect } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api";
import type { Company } from "@/lib/types";

async function submitCompany(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) redirect("/?error=Please+enter+a+company+name");

  let companyId: string;
  try {
    const { company } = await apiClient<{ company: Company }>("/companies", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    companyId = company.id;
  } catch (err) {
    if (err instanceof ApiError) {
      const msg =
        err.status === 401
          ? "Session+expired%3A+please+sign+out+and+sign+in+again."
          : encodeURIComponent(`API error (${err.status}): ${err.message}`);
      redirect(`/?error=${msg}`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }

  redirect(`/company/${companyId!}`);
}

export default function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string; name?: string };
}) {
  const error = searchParams.error
    ? decodeURIComponent(searchParams.error)
    : null;

  return (
    <main className="min-h-screen bg-white flex flex-col items-center pt-32 pb-16 px-4">
      <h1 className="text-4xl font-semibold text-gray-900 text-center">
        CompanyBrief
      </h1>
      <p className="text-lg text-gray-500 mt-3 mb-8 text-center">
        Type a company name, get a full AI-generated market research brief.
      </p>
      <form action={submitCompany} className="w-full max-w-xl">
        <div className="flex gap-3">
          <input
            name="name"
            type="text"
            defaultValue={searchParams.name ?? ""}
            placeholder="e.g. Stripe, Notion, Linear…"
            required
            className="flex-1 border border-gray-200 rounded-xl px-5 py-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Research
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}
      </form>
    </main>
  );
}
