"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CompanyListItem } from "@/lib/types";

const statusBadge: Record<string, string> = {
  pending: "text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full",
  running:
    "text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse",
  complete: "text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full",
  error: "text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full",
};

export function CompanyListItem({ company }: { company: CompanyListItem }) {
  const pathname = usePathname();
  const isActive = pathname === `/company/${company.id}`;

  return (
    <Link
      href={`/company/${company.id}`}
      className={
        isActive
          ? "flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium text-sm"
          : "flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
      }
    >
      <span className="flex-1 truncate">{company.name}</span>
      <span className={statusBadge[company.status] ?? statusBadge.pending}>
        {company.status}
      </span>
    </Link>
  );
}
