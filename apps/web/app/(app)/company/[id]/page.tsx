import { getCompany, getRawToken, ApiError } from "@/lib/api";
import { AnalysisView } from "@/components/analysis/AnalysisView";

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
          initialAnalysis={
            company.status === "complete" ? company.analysis : null
          }
        />
      </div>
    </div>
  );
}
