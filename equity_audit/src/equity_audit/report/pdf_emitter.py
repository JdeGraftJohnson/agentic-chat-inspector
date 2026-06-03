from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..types import AuditRecord, Verdict

VERDICT_COLOR = {
    Verdict.PASS: colors.HexColor("#10b981"),
    Verdict.TIGHTEN: colors.HexColor("#f59e0b"),
    Verdict.BLOCK: colors.HexColor("#ef4444"),
}


def _verdict_chip(v: Verdict) -> Paragraph:
    color = VERDICT_COLOR[v].hexval()
    return Paragraph(
        f'<font color="{color}"><b>{v.value.upper()}</b></font>',
        getSampleStyleSheet()["BodyText"],
    )


def write_pdf(record: AuditRecord, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    h2 = styles["Heading2"]
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10)

    story = []
    story.append(Paragraph(f"Equity audit — {record.model_name}", h1))
    story.append(
        Paragraph(
            f"Generated {record.generated_at:%Y-%m-%d %H:%M UTC} · "
            f"n = {record.n_predictions} · threshold = {record.threshold:.2f}",
            body,
        )
    )
    if record.model_auc is not None:
        story.append(Paragraph(f"AUC = {record.model_auc:.3f}", body))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Overall verdict", h2))
    story.append(_verdict_chip(record.overall_verdict))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Framework overlays", h2))
    fw_rows = [["Framework", "Verdict", "Pass", "Tighten", "Block"]]
    for fv in record.framework_verdicts:
        fw_rows.append([fv.framework, fv.verdict.value.upper(), str(fv.passed), str(fv.tightened), str(fv.blocked)])
    fw_tbl = Table(fw_rows, hAlign="LEFT")
    fw_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#27272a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#3f3f46")),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.HexColor("#f4f4f5")]),
            ]
        )
    )
    story.append(fw_tbl)
    story.append(Spacer(1, 0.25 * inch))

    for sl in record.slices:
        story.append(Paragraph(f"Slice — {sl.axis} (baseline {sl.baseline_label})", h2))
        rows = [["label", "n", "metric", "value", "Δ vs baseline", "verdict"]]
        for c in sl.cells:
            rows.append(
                [
                    c.label,
                    str(c.n),
                    c.metric,
                    f"{c.value:+.3f}",
                    f"{c.delta_vs_baseline:+.3f}",
                    c.verdict.value.upper(),
                ]
            )
        tbl = Table(rows, hAlign="LEFT", repeatRows=1)
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#27272a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#3f3f46")),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ]
            )
        )
        story.append(tbl)
        story.append(Spacer(1, 0.2 * inch))

    story.append(Spacer(1, 0.3 * inch))
    story.append(
        Paragraph(
            "<i>This audit is tooling output, not a substitute for clinical or compliance sign-off.</i>",
            body,
        )
    )

    doc.build(story)
    return out_path
