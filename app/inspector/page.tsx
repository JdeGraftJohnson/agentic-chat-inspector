import Link from "next/link";
import { connectClinicalRagMCP } from "@/lib/mcp-client";
import { TOOL_REGISTRY, SERVER_INFO } from "@/mcp-servers/clinical-rag-mcp/server";

export const dynamic = "force-dynamic";

type Handshake =
  | { ok: true; toolCount: number; toolNames: string[]; serverUrl: string }
  | { ok: false; error: string };

async function probe(): Promise<Handshake> {
  try {
    const mcp = await connectClinicalRagMCP();
    const names = Object.keys(mcp.tools);
    await mcp.client.close();
    return {
      ok: true,
      toolCount: names.length,
      toolNames: names,
      serverUrl: mcp.serverUrl,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function InspectorPage() {
  const handshake = await probe();

  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Inspector</h1>
        <p className="text-xs text-zinc-500">
          LangSmith console mirror — MCP handshake, tool registry, live trace
          deep-link. Full panes land in M2b + M3a.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-200">
              MCP server · {SERVER_INFO.name}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                handshake.ok
                  ? "bg-emerald-900/40 text-emerald-300"
                  : "bg-red-900/40 text-red-300"
              }`}
            >
              {handshake.ok ? "online" : "offline"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            v{SERVER_INFO.version} · Web-Standards Streamable HTTP transport
          </p>
          {handshake.ok ? (
            <p className="mt-2 break-all text-[11px] text-zinc-500">
              {handshake.serverUrl}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-red-300">{handshake.error}</p>
          )}
        </article>

        <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-2 text-xs font-medium text-zinc-200">
            LangSmith project
          </div>
          <p className="text-xs text-zinc-500">
            <code className="text-zinc-300">agentic-chat-inspector</code>
          </p>
          <Link
            href="https://smith.langchain.com/projects"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[11px] text-zinc-400 underline-offset-4 hover:underline"
          >
            Open in LangSmith →
          </Link>
        </article>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Tool registry
        </div>
        <ul className="divide-y divide-zinc-800">
          {TOOL_REGISTRY.map((t) => {
            const live =
              handshake.ok && handshake.toolNames.includes(t.name);
            return (
              <li key={t.name} className="flex items-start gap-3 py-3 text-sm">
                <span
                  className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    live ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-zinc-100">
                    <code>{t.name}</code> — {t.title}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{t.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="text-[11px] text-zinc-600">
        M2a checkpoint. Trace tree (pane 1) and selected-call detail (pane 2)
        ship once LangSmith run-fetching lands in M2b.
      </footer>
    </main>
  );
}
