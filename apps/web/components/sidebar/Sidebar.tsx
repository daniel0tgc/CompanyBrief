import Link from "next/link";
import { Settings } from "lucide-react";
import { CompanyListItem } from "./CompanyListItem";
import type { CompanyListItem as CompanyListItemType } from "@/lib/types";

export function Sidebar({
  companies,
}: {
  companies: CompanyListItemType[];
}) {
  return (
    <aside className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="px-4 pt-5 pb-3 border-b border-gray-200">
        <Link
          href="/dashboard"
          className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors"
        >
          CompanyBrief
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {companies.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No companies yet.</p>
        )}
        {companies.map((c) => (
          <CompanyListItem key={c.id} company={c} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 space-y-2">
        <Link
          href="/"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
        >
          + New Company
        </Link>
        <Link
          href="/settings"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
