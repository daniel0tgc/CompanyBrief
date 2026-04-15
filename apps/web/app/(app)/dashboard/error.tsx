"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl">
        <p className="text-red-700 font-medium">Failed to load dashboard.</p>
        <p className="text-sm text-red-600 mt-1">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="mt-4 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
