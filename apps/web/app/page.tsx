"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCompanyAction } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {pending ? "Researching…" : "Research"}
    </button>
  );
}

export default function LandingPage() {
  const [state, action] = useFormState(createCompanyAction, { error: null });

  return (
    <main className="min-h-screen bg-white flex flex-col items-center pt-32 pb-16 px-4">
      <h1 className="text-4xl font-semibold text-gray-900 text-center">
        CompanyBrief
      </h1>
      <p className="text-lg text-gray-500 mt-3 mb-8 text-center">
        Type a company name, get a full AI-generated market research brief.
      </p>
      <form action={action} className="w-full max-w-xl">
        <div className="flex gap-3">
          <input
            name="name"
            type="text"
            placeholder="e.g. Stripe, Notion, Linear…"
            required
            className="flex-1 border border-gray-200 rounded-xl px-5 py-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SubmitButton />
        </div>
        {state.error && (
          <p className="mt-3 text-sm text-red-600 text-center">{state.error}</p>
        )}
      </form>
    </main>
  );
}
