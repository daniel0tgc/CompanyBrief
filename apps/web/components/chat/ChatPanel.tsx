"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/actions";
import type { ExpansionCard } from "@/lib/types";

export function ChatPanel({
  companyId,
  onNewCard,
}: {
  companyId: string;
  onNewCard: (card: ExpansionCard) => void;
}) {
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: (q: string) => sendChatMessage(companyId, q),
    onSuccess: (data) => {
      onNewCard(data.expansionCard);
      setQuestion("");
      inputRef.current?.focus();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
      {mutation.isError && (
        <p className="text-xs text-red-500 mb-2">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Something went wrong. Try again."}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <textarea
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={mutation.isPending}
          placeholder="Ask a follow-up question about this company…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !question.trim()}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors shrink-0"
        >
          {mutation.isPending ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}
