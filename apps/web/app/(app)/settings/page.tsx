"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveApiKey } from "@/lib/actions";
import { Key, ExternalLink, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (key: string | null) => saveApiKey(key),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(apiKey.trim() || null);
  }

  function handleClear() {
    setApiKey("");
    mutation.mutate(null);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="text-sm text-gray-500 mt-1">
        Manage your account preferences.
      </p>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Your Groq API Key
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Add your own key to use your personal Groq quota instead of the shared
          key. Analysis runs on{" "}
          <strong>Llama 3.3 70B</strong> — a free, open-source model.{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline inline-flex items-center gap-0.5"
          >
            Get a free key at console.groq.com
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {mutation.isError && (
            <p className="text-xs text-red-500">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to save. Try again."}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {mutation.isPending ? "Saving…" : "Save key"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={mutation.isPending}
              className="text-gray-500 hover:text-gray-900 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Clear key
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          Your key is stored in your account and used only for your own analyses
          and chats. It is never shared. Leave blank to use the shared key.
        </p>
      </div>
    </div>
  );
}
