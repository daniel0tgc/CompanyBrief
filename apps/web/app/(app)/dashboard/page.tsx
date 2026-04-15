import Link from "next/link";
import { getCompanies } from "@/lib/api";
import type { CompanyListItem } from "@/lib/types";

const statusBadge: Record<string, string> = {
  pending: "text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full",
  running:
    "text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse",
  complete: "text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full",
  error: "text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full",
};

function CompanyCard({ company }: { company: CompanyListItem }) {
  return (
    <Link
      href={`/company/${company.id}`}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          {company.name}
        </h2>
        <span className={statusBadge[company.status] ?? statusBadge.pending}>
          {company.status}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {new Date(company.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  let companies: CompanyListItem[] = [];
  try {
    companies = await getCompanies();
  } catch {
    // Fall through to empty state
  }

  if (companies.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Dashboard
        </h1>
        <div className="flex flex-col items-center justify-center pt-24 text-center">
          <p className="text-gray-500 mb-4">
            No companies yet. Search for one above.
          </p>
          <Link
            href="/"
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((c) => (
          <CompanyCard key={c.id} company={c} />
        ))}
      </div>
    </div>
  );
}
