"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Brain, Search, CheckCircle, AlertCircle, Layers } from "lucide-react";
import type { ThinkingEntry } from "@/lib/useAnalysisStream";

function EntryIcon({ type }: { type: ThinkingEntry["type"] }) {
  if (type === "thinking") return <Brain className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />;
  if (type === "tool_call") return <Search className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />;
  if (type === "tool_result") return <CheckCircle className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />;
  if (type === "section_complete") return <Layers className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />;
  return <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />;
}

export function AgentThinking({
  thinking,
  isStreaming,
}: {
  thinking: ThinkingEntry[];
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isStreaming && thinking.length === 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500 font-mono mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isStreaming && !open && (
          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        )}
        <span className="font-semibold text-gray-600 text-xs">
          {isStreaming ? "Researching…" : `Agent trace (${thinking.length} events)`}
        </span>
        <span className="ml-auto">
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 border-t border-gray-200 pt-3">
          {thinking.length === 0 ? (
            <p className="text-gray-400">Waiting for agent…</p>
          ) : (
            thinking.map((entry, i) => (
              <div key={i} className="flex gap-1.5">
                <EntryIcon type={entry.type} />
                <span className="break-words leading-relaxed">{entry.content}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
