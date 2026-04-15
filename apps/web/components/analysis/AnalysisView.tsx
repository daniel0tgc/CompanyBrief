"use client";

import { useAnalysisStream } from "@/lib/useAnalysisStream";
import { AgentThinking } from "./AgentThinking";
import { SectionCard } from "./SectionCard";
import type { CompanyAnalysis, ExpansionCard } from "@/lib/types";

const SECTIONS: { key: keyof CompanyAnalysis; title: string; fullWidth?: boolean }[] = [
  { key: "tagline", title: "Tagline" },
  { key: "what_they_do", title: "What They Do" },
  { key: "problem_solved", title: "Problem Solved" },
  { key: "ai_angle", title: "AI Angle" },
  { key: "competitive_position", title: "Competitive Position" },
  { key: "competitors", title: "Competitors" },
  { key: "customers", title: "Customers" },
  { key: "market_attractiveness", title: "Market Attractiveness" },
  { key: "disruption_risks", title: "Disruption Risks" },
  { key: "future_outlook", title: "Future Outlook" },
  { key: "bull_case", title: "Bull Case", fullWidth: true },
  { key: "bear_case", title: "Bear Case", fullWidth: true },
  { key: "feedback", title: "User Feedback", fullWidth: true },
];

export function AnalysisView({
  companyId,
  token,
  initialAnalysis,
  expansionCards = [],
}: {
  companyId: string;
  token: string | null;
  initialAnalysis?: CompanyAnalysis | null;
  expansionCards?: ExpansionCard[];
}) {
  const { sections, thinking, isStreaming } = useAnalysisStream(
    initialAnalysis ? null : companyId,
    initialAnalysis ? null : token,
  );

  const data: Partial<CompanyAnalysis> = initialAnalysis ?? sections;

  return (
    <div>
      <AgentThinking thinking={thinking} isStreaming={isStreaming} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SECTIONS.map(({ key, title, fullWidth }) => {
          const sectionData = data[key];
          const isLoading = sectionData === undefined;
          const cards = expansionCards.filter((c) => c.sectionKey === key);

          return (
            <div key={key} className={fullWidth ? "col-span-full" : undefined}>
              <SectionCard
                title={title}
                sectionKey={key}
                data={sectionData}
                expansionCards={cards}
                isLoading={isLoading}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
