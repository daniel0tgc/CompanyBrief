"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveApiKey } from "@/lib/actions";
import { Key, ExternalLink, CheckCircle } from "lucide-react";

type Provider = { label: string; color: string; hint: string; docsUrl: string; model: string };

const PROVIDERS: Record<string, Provider> = {
  anthropic: {
    label: "Anthropic (Claude)",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    hint: "Starts with sk-ant-",
    docsUrl: "https://console.anthropic.com/keys",
    model: "claude-3-5-sonnet-20241022",
  },
  groq: {
    label: "Groq (Llama 3.3 — free)",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    hint: "Starts with gsk_",
    docsUrl: "https://console.groq.com/keys",
    model: "llama-3.3-70b-versatile",
  },
  openai: {
    label: "OpenAI (GPT-4o mini)",
    color: "text-green-600 bg-green-50 border-green-200",
    hint: "Starts with sk-",
    docsUrl: "https://platform.openai.com/api-keys",
    model: "gpt-4o-mini",
  },
};

function detectProvider(key: string): keyof typeof PROVIDERS | null {
  if (!key.trim()) return null;
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const detectedProvider = detectProvider(apiKey);
  const providerInfo = detectedProvider ? PROVIDERS[detectedProvider] : null;

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
      <p className="text-sm text-gray-500 mt-1">Manage your account preferences.</p>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">AI API Key</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Paste any supported API key below — the provider is detected automatically.
          Leave blank to use the shared Groq key.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(PROVIDERS).map(([id, p]) => (
            <div key={id} className="border border-gray-100 rounded-lg p-3 text-xs">
              <p className="font-medium text-gray-700">{p.label.split(" (")[0]}</p>
              <p className="text-gray-400 mt-0.5">{p.hint}</p>
              <a
                href={p.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline inline-flex items-center gap-0.5 mt-1"
              >
                Get key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
              placeholder="sk-ant-…  or  gsk_…  or  sk-…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-36"
            />
            {providerInfo && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-0.5 rounded-full border ${providerInfo.color}`}>
                {providerInfo.label}
              </span>
            )}
          </div>

          {providerInfo && (
            <p className="text-xs text-gray-500">
              Will use <strong>{providerInfo.model}</strong> for analysis and chat.
            </p>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to save. Try again."}
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
          Your key is encrypted in transit, stored in your account, and used only
          for your own analyses. It is never shared with other users.
        </p>
      </div>
    </div>
  );
}
