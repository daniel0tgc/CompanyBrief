import { Sidebar } from "@/components/sidebar/Sidebar";
import { getCompanies } from "@/lib/api";
import type { CompanyListItem } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let companies: CompanyListItem[] = [];
  try {
    companies = await getCompanies();
  } catch {
    // Not authenticated or API unavailable — middleware handles redirect
  }

  return (
    <div>
      <Sidebar companies={companies} />
      <main className="ml-64 min-h-screen bg-white">{children}</main>
    </div>
  );
}
