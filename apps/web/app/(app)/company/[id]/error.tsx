"use client";

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl">
        <p className="text-red-700 font-medium">Something went wrong.</p>
        <p className="text-sm text-red-600 mt-1">
          {error.message || "An unexpected error occurred while loading this company."}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={reset}
            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline self-center"
          >
            ← Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
