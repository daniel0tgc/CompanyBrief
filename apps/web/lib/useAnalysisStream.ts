"use client";

import { useEffect, useRef, useState } from "react";
import type { CompanyAnalysis } from "@/lib/types";

export type ThinkingEntry = {
  type: "thinking" | "tool_call" | "tool_result" | "section_complete" | "error";
  content: string;
  timestamp: number;
};

type StreamState = {
  sections: Partial<CompanyAnalysis>;
  thinking: ThinkingEntry[];
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useAnalysisStream(
  companyId: string | null,
  token: string | null,
): StreamState {
  const [state, setState] = useState<StreamState>({
    sections: {},
    thinking: [],
    isStreaming: false,
    isComplete: false,
    error: null,
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!companyId || !token) return;

    setState({
      sections: {},
      thinking: [],
      isStreaming: true,
      isComplete: false,
      error: null,
    });

    const url = `${API_URL}/companies/${companyId}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as {
          type: string;
          payload: unknown;
        };

        if (event.type === "replay") {
          setState((prev) => ({
            ...prev,
            sections: event.payload as Partial<CompanyAnalysis>,
            isStreaming: false,
            isComplete: true,
          }));
          es.close();
          return;
        }

        if (event.type === "section_complete") {
          const payload = event.payload as { section: string; data: unknown };
          setState((prev) => ({
            ...prev,
            sections: {
              ...prev.sections,
              ...(payload.data as Partial<CompanyAnalysis>),
            },
            thinking: [
              ...prev.thinking,
              {
                type: "section_complete",
                content: `Section complete: ${payload.section}`,
                timestamp: Date.now(),
              },
            ],
          }));
          return;
        }

        if (
          event.type === "thinking" ||
          event.type === "tool_call" ||
          event.type === "tool_result"
        ) {
          const payload = event.payload as Record<string, unknown>;
          const content =
            event.type === "thinking"
              ? (payload.text as string)
              : event.type === "tool_call"
                ? `Tool: ${payload.tool} — ${JSON.stringify(payload.input).slice(0, 120)}`
                : `Result from ${payload.tool}: ${(payload.preview as string).slice(0, 120)}`;

          setState((prev) => ({
            ...prev,
            thinking: [
              ...prev.thinking,
              { type: event.type as ThinkingEntry["type"], content, timestamp: Date.now() },
            ],
          }));
          return;
        }

        if (event.type === "error") {
          const payload = event.payload as { message: string };
          setState((prev) => ({
            ...prev,
            error: payload.message,
            isStreaming: false,
          }));
          es.close();
        }
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: prev.error ?? "Stream connection lost.",
      }));
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [companyId, token]);

  return state;
}
