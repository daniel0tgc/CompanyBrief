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
