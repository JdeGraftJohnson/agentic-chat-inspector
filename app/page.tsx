import Link from "next/link";

const SURFACES = [
  {
    href: "/chat",
    title: "Streaming agentic chat",
    body: "Multi-provider toggle (Claude · GPT-4o · Llama 3.3 70B). Every turn traced to LangSmith via wrapAISDK.",
    status: "M1 — live",
  },
  {
    href: "/inspector",
    title: "Inspector",
    body: "LangSmith console mirror — traces, datasets, experiments, annotation queue. Each panel deep-links to live LangSmith.",
    status: "M2–M3 — pending",
  },
  {
    href: "/equity",
    title: "Health Equity Audit",
    body: "Interactive fairness viewer backed by the equity-audit Python package. NICE ESF Tier B · NHS Core20PLUS5 · UK GDPR Art. 22.",
    status: "M4 — pending",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          johndegraft.app / projects / agentic-inspector
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
          Agentic Chat &amp; LangSmith Inspector
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          A LangSmith-instrumented agentic platform — datasets, experiments,
          custom evaluators, annotation queues, prompt hub, and an online
          evaluator on production traces — running against a live multi-provider
          MCP chat. Cross-links a clinical RAG eval harness and a reusable
          health-equity fairness library.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {SURFACES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded border border-zinc-800 bg-zinc-950/40 p-4 transition hover:border-zinc-600"
          >
            <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
              {s.status}
            </div>
            <div className="mb-2 text-sm font-medium text-zinc-100 group-hover:text-white">
              {s.title} →
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">{s.body}</p>
          </Link>
        ))}
      </section>

      <footer className="text-xs text-zinc-600">
        Source · plan ·{" "}
        <code className="text-zinc-500">roll-into-project-3-gentle-giraffe</code>
      </footer>
    </main>
  );
}
