import { getCompany } from "@/lib/api";
import { ApiError } from "@/lib/api";

export default async function CompanyPage({
  params,
}: {
  params: { id: string };
}) {
  let company;
  try {
    company = await getCompany(params.id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return (
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700 font-medium">Company not found.</p>
          </div>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
      {company.status === "pending" && (
        <p className="text-sm text-yellow-600 mt-2">
          Analysis queued — starting soon…
        </p>
      )}
      {company.status === "running" && (
        <p className="text-sm text-blue-600 mt-2 animate-pulse">
          Analysis running…
        </p>
      )}
      {company.status === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">
            {company.errorMessage ?? "Analysis failed."}
          </p>
        </div>
      )}
      {company.status === "complete" && company.analysis && (
        <p className="text-sm text-gray-500 mt-2">
          {company.analysis.tagline}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-6">
        Full analysis UI coming in Phase 6.
      </p>
    </div>
  );
}
