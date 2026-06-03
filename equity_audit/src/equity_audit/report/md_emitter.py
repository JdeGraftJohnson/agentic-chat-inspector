from __future__ import annotations

from pathlib import Path

from ..types import AuditRecord, Verdict

VERDICT_BADGE = {
    Verdict.PASS: "**PASS**",
    Verdict.TIGHTEN: "**TIGHTEN**",
    Verdict.BLOCK: "**BLOCK**",
}


def write_markdown(record: AuditRecord, out_path: Path) -> Path:
    lines: list[str] = []
    lines.append(f"# Equity audit — {record.model_name}")
    lines.append("")
    lines.append(
        f"Generated {record.generated_at:%Y-%m-%d %H:%M UTC} · n = {record.n_predictions} · threshold = {record.threshold:.2f}"
    )
    if record.model_auc is not None:
        lines.append(f"AUC = {record.model_auc:.3f}")
    lines.append("")
    lines.append(f"## Overall verdict: {VERDICT_BADGE[record.overall_verdict]}")
    lines.append("")

    lines.append("## Framework overlays")
    for fv in record.framework_verdicts:
        lines.append(
            f"- {fv.framework} — {VERDICT_BADGE[fv.verdict]} "
            f"(pass {fv.passed}, tighten {fv.tightened}, block {fv.blocked})"
        )
    lines.append("")

    for fv in record.framework_verdicts:
        lines.append(f"### {fv.framework}")
        for it in fv.items:
            note = f" — {it.note}" if it.note else ""
            lines.append(f"- `{it.id}` {VERDICT_BADGE[it.status]} — {it.description}{note}")
        lines.append("")

    lines.append("## Slice metrics")
    for sl in record.slices:
        lines.append(f"### {sl.axis} (baseline = `{sl.baseline_label}`)")
        lines.append("")
        lines.append("| label | n | metric | value | Δ vs baseline | verdict |")
        lines.append("|---|---|---|---|---|---|")
        for c in sl.cells:
            lines.append(
                f"| {c.label} | {c.n} | {c.metric} | {c.value:+.3f} | "
                f"{c.delta_vs_baseline:+.3f} | {VERDICT_BADGE[c.verdict]} |"
            )
        lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path
