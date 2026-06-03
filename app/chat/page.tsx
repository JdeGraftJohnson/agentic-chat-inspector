"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  PROVIDERS,
  DEFAULT_PROVIDER,
  type ProviderId,
} from "@/lib/providers";

type ProviderStatus = {
  id: ProviderId;
  label: string;
  modelLabel: string;
  available: boolean;
  reason?: string;
};

type StatusPayload = {
  statuses: ProviderStatus[];
  anyAvailable: boolean;
  hostedOnVercel: boolean;
};

export default function ChatPage() {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [input, setInput] = useState("");
  const [statusPayload, setStatusPayload] = useState<StatusPayload | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/providers/status", { cache: "no-store" })
      .then((r) => r.json() as Promise<StatusPayload>)
      .then((data) => {
        setStatusPayload(data);
        if (data.anyAvailable) {
          const current = data.statuses.find((s) => s.id === provider);
          if (!current || !current.available) {
            const firstAvail = data.statuses.find((s) => s.available);
            if (firstAvail) setProvider(firstAvail.id);
          }
        }
      })
      .catch(() => setStatusPayload(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, provider },
      }),
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const noProviders = statusPayload !== null && !statusPayload.anyAvailable;
  const selectedStatus = statusPayload?.statuses.find((s) => s.id === provider);
  const selectedUnavailable =
    statusPayload !== null && selectedStatus !== undefined && !selectedStatus.available;

  return (
    <main className="mx-auto flex h-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
          <p className="text-xs text-zinc-500">
            Streaming via Vercel AI SDK · traced to LangSmith project{" "}
            <code className="text-zinc-300">agentic-chat-inspector</code>
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderId)}
            disabled={isStreaming}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 disabled:opacity-50"
          >
            {Object.values(PROVIDERS).map((p) => {
              const s = statusPayload?.statuses.find((x) => x.id === p.id);
              const available = s ? s.available : true;
              return (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.modelLabel}
                  {p.kind === "subscription" ? " (no key)" : ""}
                  {available ? "" : " · unavailable"}
                </option>
              );
            })}
          </select>
        </label>
      </header>

      {noProviders && (
        <div className="rounded border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100/80">
          <p className="mb-1 font-medium text-amber-200">
            No chat providers configured on this deployment.
          </p>
          <p>
            The LangSmith showcase (datasets, evaluators, experiments, prompt
            hub, annotation queue, online evaluator) and the equity audit
            dashboard remain fully functional and are linked from the project
            README. To exercise the live chat surface, clone the repo and
            either log into Claude Code (
            <code className="text-amber-200">claude</code> CLI) or set an{" "}
            <code className="text-amber-200">ANTHROPIC_API_KEY</code> /{" "}
            <code className="text-amber-200">OPENAI_API_KEY</code> /{" "}
            <code className="text-amber-200">TOGETHER_API_KEY</code> in{" "}
            <code className="text-amber-200">.env.local</code>.
          </p>
        </div>
      )}

      {selectedUnavailable && !noProviders && (
        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-400">
          <span className="text-zinc-200">{selectedStatus?.label}</span> is
          unavailable here. {selectedStatus?.reason ?? ""}
        </div>
      )}

      <section className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="rounded border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            Try asking <em>“What does this demo prove about LangSmith?”</em> or{" "}
            <em>“Show me a streaming response.”</em>
          </div>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className="rounded border border-zinc-800 bg-zinc-950/40 p-3 text-sm leading-relaxed"
          >
            <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
              {m.role}
            </div>
            <div className="whitespace-pre-wrap text-zinc-100">
              {m.parts.map((part, i) =>
                part.type === "text" ? (
                  <span key={i}>{part.text}</span>
                ) : null,
              )}
            </div>
          </article>
        ))}
        {error && (
          <div className="rounded border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-200">
            {error.message}
          </div>
        )}
      </section>

      <form
        className="flex gap-2 border-t border-zinc-800 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || isStreaming || selectedUnavailable) return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <input
          name="message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            selectedUnavailable
              ? "Provider unavailable on this deployment"
              : "Ask anything…"
          }
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-50"
          disabled={isStreaming || selectedUnavailable}
          autoFocus
        />
        <button
          type="submit"
          disabled={
            isStreaming || selectedUnavailable || input.trim().length === 0
          }
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isStreaming ? "Streaming…" : "Send"}
        </button>
      </form>
    </main>
  );
}
