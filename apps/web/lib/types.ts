export type CompanyStatus = "pending" | "running" | "complete" | "error";

export type CompanyListItem = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  status: CompanyStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Company = CompanyListItem & {
  analysis: CompanyAnalysis | null;
};

export type CompanyAnalysis = {
  tagline: string;
  what_they_do: string[];
  problem_solved: string[];
  ai_angle: string[];
  competitive_position: string[];
  competitors: { name: string; notes: string }[];
  customers: { category: string; examples: string[] }[];
  market_attractiveness: string[];
  disruption_risks: string[];
  future_outlook: string[];
  bull_case: string;
  bear_case: string;
  feedback: { pros: string[]; cons: string[]; source_url: string };
  doc_url: string;
};

export type ExpansionCard = {
  id: string;
  companyId: string;
  sectionKey: string;
  question: string;
  content: string;
  createdAt: string;
};
