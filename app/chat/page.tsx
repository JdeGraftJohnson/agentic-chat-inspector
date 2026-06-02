"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { PROVIDERS, DEFAULT_PROVIDER, type ProviderId } from "@/lib/providers";

export default function ChatPage() {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, provider },
      }),
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

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
            {Object.values(PROVIDERS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.modelLabel}
              </option>
            ))}
          </select>
        </label>
      </header>

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
          if (!text || isStreaming) return;
          sendMessage({ text });
          setInput("");
        }}
      >
        <input
          name="message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-50"
          disabled={isStreaming}
          autoFocus
        />
        <button
          type="submit"
          disabled={isStreaming || input.trim().length === 0}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isStreaming ? "Streaming…" : "Send"}
        </button>
      </form>
    </main>
  );
}
