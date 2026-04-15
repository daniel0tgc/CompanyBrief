import { getCompany, getRawToken, ApiError } from "@/lib/api";
import { AnalysisView } from "@/components/analysis/AnalysisView";

export default async function CompanyPage({
  params,
}: {
  params: { id: string };
}) {
  let company;
  let expansionCards;
  try {
    const result = await getCompany(params.id);
    company = result.company;
    expansionCards = result.expansionCards;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0;
    const message =
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "An unexpected error occurred.";

    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium">
            {status === 404 ? "Company not found." : "Failed to load company."}
          </p>
          <p className="text-sm text-red-600 mt-1">{message}</p>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  if (company.status === "error") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-sm font-medium text-red-700">Analysis failed</p>
          <p className="text-sm text-red-600 mt-1">
            {company.errorMessage ?? "An unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }

  const token = await getRawToken();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">{company.name}</h1>
      {company.analysis?.tagline && (
        <p className="text-base text-gray-500 mt-1">{company.analysis.tagline}</p>
      )}

      <div className="mt-6">
        <AnalysisView
          companyId={company.id}
          token={token}
          initialAnalysis={company.status === "complete" ? company.analysis : null}
          initialExpansionCards={expansionCards}
        />
      </div>
    </div>
  );
}
