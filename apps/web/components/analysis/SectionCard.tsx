import { SectionCardSkeleton } from "./SectionCardSkeleton";
import type { ExpansionCard } from "@/lib/types";

type StringArray = string[];
type CompetitorItem = { name: string; notes: string };
type CustomerItem = { category: string; examples: string[] };
type FeedbackShape = { pros: string[]; cons: string[]; source_url: string };

function renderContent(data: unknown): React.ReactNode {
  if (data === null || data === undefined) return null;

  if (typeof data === "string") {
    return <p className="text-sm text-gray-700 leading-relaxed">{data}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-sm text-gray-400 italic">No data available.</p>;
    }

    const first = data[0];

    // Guard: if the first element is not a plain object, treat the whole
    // array as a string list (handles cases where the AI returned a string
    // field wrapped in an array, e.g. tagline: ["Stripe is..."])
    if (typeof first !== "object" || first === null) {
      // Single-element string array that was meant to be a plain string
      if (data.length === 1 && typeof first === "string") {
        return <p className="text-sm text-gray-700 leading-relaxed">{first}</p>;
      }
      return (
        <ul className="space-y-1.5">
          {data.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="text-blue-400 mt-1.5 shrink-0">•</span>
              <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    const firstObj = first as Record<string, unknown>;

    if ("name" in firstObj && "notes" in firstObj) {
      return (
        <div className="space-y-2">
          {(data as CompetitorItem[]).map((item, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-sm font-semibold text-gray-900 w-32 shrink-0">{item.name}</span>
              <span className="text-sm text-gray-500 leading-relaxed">{item.notes}</span>
            </div>
          ))}
        </div>
      );
    }

    if ("category" in firstObj && "examples" in firstObj) {
      return (
        <div className="space-y-2">
          {(data as CustomerItem[]).map((item, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                {item.category}
              </span>
              <span className="text-sm text-gray-600 leading-relaxed">
                {item.examples.join(", ")}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="space-y-1.5">
        {(data as StringArray).map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="text-blue-400 mt-1.5 shrink-0">•</span>
            <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof data === "object" && data !== null && "pros" in data) {
    const fb = data as FeedbackShape;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Pros</p>
            <ul className="space-y-1">
              {fb.pros.map((p, i) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-1.5">
                  <span className="text-green-500 shrink-0">+</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Cons</p>
            <ul className="space-y-1">
              {fb.cons.map((c, i) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-1.5">
                  <span className="text-red-400 shrink-0">−</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {fb.source_url && (
          <a
            href={fb.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline break-all"
          >
            Source: {fb.source_url}
          </a>
        )}
      </div>
    );
  }

  return null;
}

export function SectionCard({
  title,
  sectionKey,
  data,
  expansionCards,
  isLoading,
}: {
  title: string;
  sectionKey: string;
  data: unknown;
  expansionCards: ExpansionCard[];
  isLoading: boolean;
}) {
  if (isLoading) return <SectionCardSkeleton />;

  return (
    <div data-section={sectionKey} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        {title}
      </h3>
      {renderContent(data)}
      {expansionCards.map((card) => (
        <div
          key={card.id}
          className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-3"
        >
          <p className="text-xs text-gray-500 mb-1">{card.question}</p>
          <p className="text-sm text-gray-800 leading-relaxed">{card.content}</p>
        </div>
      ))}
    </div>
  );
}

