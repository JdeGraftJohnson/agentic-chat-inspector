import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type AuditRecord,
  type FrameworkVerdict,
  type SliceMetric,
  type SliceResult,
  type Verdict,
  VERDICT_TONE,
} from "@/lib/equity-types";

export const dynamic = "force-dynamic";

async function loadAudit(): Promise<AuditRecord> {
  const path = resolve(process.cwd(), "public/demo/equity-audit.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as AuditRecord;
}

function VerdictPill({ v }: { v: Verdict }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${VERDICT_TONE[v]}`}
    >
      {v}
    </span>
  );
}

function metricLabel(m: SliceMetric["metric"]): string {
  return (
    {
      equalized_odds: "Equalized-odds",
      demographic_parity: "Demographic parity",
      calibration_gap: "Calibration gap",
      fnr_gap: "False-negative-rate gap",
    } as const
  )[m];
}

function SliceCard({ slice }: { slice: SliceResult }) {
  return (
    <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-100">{slice.axis}</div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            baseline <code className="text-zinc-300">{slice.baseline_label}</code>
          </div>
        </div>
        <VerdictPill v={slice.worst_verdict} />
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1 pr-2 text-left font-normal">cell</th>
              <th className="px-2 text-right font-normal">n</th>
              <th className="px-2 text-left font-normal">metric</th>
              <th className="px-2 text-right font-normal">value</th>
              <th className="px-2 text-right font-normal">Δ</th>
              <th className="px-2 text-left font-normal">verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {slice.cells.map((c, i) => (
              <tr key={`${c.label}-${c.metric}-${i}`} className="text-zinc-200">
                <td className="py-1.5 pr-2">{c.label}</td>
                <td className="px-2 text-right tabular-nums text-zinc-400">
                  {c.n}
                </td>
                <td className="px-2 text-zinc-400">{metricLabel(c.metric)}</td>
                <td className="px-2 text-right tabular-nums">
                  {c.value.toFixed(3)}
                </td>
                <td
                  className={`px-2 text-right tabular-nums ${
                    Math.abs(c.delta_vs_baseline) > 0.05
                      ? "text-amber-300"
                      : "text-zinc-300"
                  }`}
                >
                  {c.delta_vs_baseline >= 0 ? "+" : ""}
                  {c.delta_vs_baseline.toFixed(3)}
                </td>
                <td className="px-2">
                  <VerdictPill v={c.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function FrameworkCard({ fv }: { fv: FrameworkVerdict }) {
  return (
    <article className="rounded border border-zinc-800 bg-zinc-950/40 p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-zinc-100">{fv.framework}</div>
          <div className="text-[11px] text-zinc-500">
            pass {fv.passed} · tighten {fv.tightened} · block {fv.blocked}
          </div>
        </div>
        <VerdictPill v={fv.verdict} />
      </header>
      <ul className="divide-y divide-zinc-800/60">
        {fv.items.map((it) => (
          <li key={it.id} className="flex items-start gap-3 py-2 text-xs">
            <span className="mt-0.5 shrink-0">
              <VerdictPill v={it.status} />
            </span>
            <div className="flex-1">
              <div className="text-zinc-200">
                <code className="text-[11px] text-zinc-300">{it.id}</code>
              </div>
              <p className="mt-0.5 leading-relaxed text-zinc-500">
                {it.description}
              </p>
              {it.note && (
                <p className="mt-1 text-[11px] text-amber-300/80">{it.note}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default async function EquityPage() {
  const audit = await loadAudit();
  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="space-y-1 border-b border-zinc-800 pb-3">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500">
          /equity · health-equity audit
        </p>
        <h1 className="text-lg font-semibold tracking-tight">
          {audit.model_name}
        </h1>
        <p className="text-xs text-zinc-500">
          Synthetic deliberately-biased toy model · n = {audit.n_predictions} ·
          threshold = {audit.threshold.toFixed(2)}
          {audit.model_auc !== null && ` · AUC = ${audit.model_auc.toFixed(3)}`}
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-400">
        <span>Overall verdict</span>
        <VerdictPill v={audit.overall_verdict} />
        <span className="text-zinc-600">
          generated {new Date(audit.generated_at).toUTCString()}
        </span>
        <span className="ml-auto flex gap-3 text-zinc-400">
          <a
            href="/demo/equity-audit.pdf"
            className="underline-offset-4 hover:underline"
          >
            PDF report
          </a>
          <a
            href="/api/equity/audit"
            className="underline-offset-4 hover:underline"
          >
            JSON record
          </a>
        </span>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Framework overlays
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {audit.framework_verdicts.map((fv) => (
            <FrameworkCard key={fv.framework} fv={fv} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Slice metrics
        </h2>
        <div className="grid gap-3">
          {audit.slices.map((s) => (
            <SliceCard key={s.axis} slice={s} />
          ))}
        </div>
      </section>

      <section className="rounded border border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-100/80">
        <p className="font-medium text-amber-200">Disclaimer</p>
        <p className="mt-1 leading-relaxed">
          Synthetic deliberately-biased toy model. Not a real clinical AI under
          audit. NICE ESF Tier B, NHS Core20PLUS5, UK GDPR Article 22, and
          HIPAA references are accurate to public guidance / NIST SP 800-66r2
          (Feb 2024) as of 2026-06; this tool is not endorsed by NICE,
          NHS England, ICO, or HHS / OCR.
        </p>
      </section>
    </main>
  );
}
