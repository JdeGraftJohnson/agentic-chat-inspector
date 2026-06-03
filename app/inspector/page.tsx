import Link from "next/link";
import {
  probeAllMCP,
  MCP_SERVER_CATALOG,
  type McpServerKey,
  type ServerStatus,
} from "@/lib/mcp-client";
import { TOOL_REGISTRY as CLINICAL_REGISTRY } from "@/mcp-servers/clinical-rag-mcp/server";
import { TOOL_REGISTRY as DRAFT_REGISTRY } from "@/mcp-servers/draft-actions-mcp/server";
import { getActiveSystemPrompt } from "@/lib/prompts";
import {
  REVIEW_QUEUE_NAME,
  tracingEnabled,
} from "@/lib/langsmith-feedback";

export const dynamic = "force-dynamic";

const REGISTRIES: Record<
  McpServerKey,
  readonly { name: string; title: string; description: string }[]
> = {
  "clinical-rag": CLINICAL_REGISTRY,
  "draft-actions": DRAFT_REGISTRY,
};

const KIND: Record<McpServerKey, string> = {
  "clinical-rag": "read",
  "draft-actions": "simulated write",
};

function ServerCard({
  status,
  registry,
}: {
  status: ServerStatus;
  registry: readonly { name: string; title: string; description: string }[];
}) {
  const advertisedNames = status.ok ? status.toolNames : [];
  return (
    <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-100">{status.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            {KIND[status.key]} · Streamable HTTP
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            status.ok
              ? "bg-emerald-900/40 text-emerald-300"
              : "bg-red-900/40 text-red-300"
          }`}
        >
          {status.ok ? "online" : "offline"}
        </span>
      </header>
      <p className="break-all text-[11px] text-zinc-500">{status.url}</p>
      {!status.ok && (
        <p className="mt-2 text-[11px] text-red-300">{status.error}</p>
      )}
      <ul className="mt-3 divide-y divide-zinc-800">
        {registry.map((t) => {
          const live = advertisedNames.includes(t.name);
          return (
            <li key={t.name} className="flex items-start gap-3 py-2.5 text-sm">
              <span
                className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                  live ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              <div className="flex-1">
                <div className="text-zinc-100">
                  <code className="text-[12px]">{t.name}</code>
                  <span className="text-zinc-500"> — {t.title}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {t.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default async function InspectorPage() {
  const [statuses, system] = await Promise.all([
    probeAllMCP(),
    getActiveSystemPrompt(),
  ]);
  const tracing = tracingEnabled();

  const onlineCount = statuses.filter((s) => s.ok).length;
  const toolCount = statuses.reduce(
    (sum, s) => (s.ok ? sum + s.toolNames.length : sum),
    0,
  );

  const ordered = (Object.keys(MCP_SERVER_CATALOG) as McpServerKey[])
    .map((k) => statuses.find((s) => s.key === k))
    .filter((s): s is ServerStatus => Boolean(s));

  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Inspector</h1>
        <p className="text-xs text-zinc-500">
          LangSmith console mirror — MCP handshake, prompt hub version, online
          evaluator, annotation queue. Trace tree + experiment table land with
          the recruiter-polish pass.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs">
        <div className="text-zinc-400">
          <span className="font-medium text-zinc-200">
            {onlineCount}/{ordered.length}
          </span>{" "}
          MCP servers online
        </div>
        <div className="text-zinc-400">
          <span className="font-medium text-zinc-200">{toolCount}</span> tools
          advertised
        </div>
        <div className="text-zinc-400">
          LangSmith project{" "}
          <code className="text-zinc-300">agentic-chat-inspector</code>
        </div>
        <div className="ml-auto">
          <Link
            href="https://smith.langchain.com/projects"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 underline-offset-4 hover:underline"
          >
            Open in LangSmith →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
            Prompt Hub
          </div>
          <div className="text-sm text-zinc-100">
            agentic-chat-inspector-system{" "}
            <code className="text-zinc-300">{system.version}</code>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            File source ·{" "}
            <code className="text-zinc-400">prompts/system_{system.version}.md</code>
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            Push commits with <code className="text-zinc-400">scripts/push_prompts.py</code>;
            the chat route pulls from cache (5 min TTL).
          </p>
        </article>

        <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
            Online evaluator
          </div>
          <div className="text-sm text-zinc-100">
            <code className="text-zinc-300">online.phi_secret_leakage</code>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Regex over serialized tool args — SSN / NHS number / Visa /
            Anthropic / OpenAI / GitHub / LangSmith key / PEM block. Fires on
            every production turn; clean = 1.0, leak = 0.0.
          </p>
        </article>

        <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
            Annotation queue
          </div>
          <div className="break-all text-sm text-zinc-100">
            <code className="text-zinc-300">{REVIEW_QUEUE_NAME}</code>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Auto-routed on{" "}
            <code className="text-zinc-400">tool_use_correctness &lt; 0.6</code>{" "}
            or{" "}
            <code className="text-zinc-400">phi_secret_leakage &lt; 1.0</code>.
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            Tracing{" "}
            <span
              className={tracing ? "text-emerald-300" : "text-zinc-400"}
            >
              {tracing ? "ON" : "OFF — set LANGSMITH_TRACING=true"}
            </span>
            .
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {ordered.map((s) => (
          <ServerCard key={s.key} status={s} registry={REGISTRIES[s.key]} />
        ))}
      </section>

      <footer className="text-[11px] text-zinc-600">
        M3 checkpoint. Live trace cards and the experiment-comparison table
        land with the recruiter-polish pass.
      </footer>
    </main>
  );
}
