"""equity-audit CLI."""
from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Table as RichTable

from .audit import run_audit
from .report import write_json, write_markdown, write_pdf

app = typer.Typer(no_args_is_help=True, add_completion=False)
console = Console()


@app.command()
def run(
    predictions: Annotated[Path, typer.Option(exists=True)],
    demographics: Annotated[Path, typer.Option(exists=True)],
    output_dir: Annotated[Path, typer.Option()] = Path("./equity-audit-out"),
    model_name: Annotated[str, typer.Option()] = "untitled-model",
    threshold: Annotated[float, typer.Option(min=0.0, max=1.0)] = 0.5,
    no_pdf: Annotated[bool, typer.Option(help="Skip reportlab PDF emit")] = False,
) -> None:
    record = run_audit(
        predictions_path=predictions,
        demographics_path=demographics,
        model_name=model_name,
        threshold=threshold,
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    json_path = write_json(record, output_dir / "audit_record.json")
    md_path = write_markdown(record, output_dir / "audit_report.md")
    pdf_path = (
        write_pdf(record, output_dir / "audit_report.pdf") if not no_pdf else None
    )

    table = RichTable(title=f"Equity audit — {record.model_name}")
    table.add_column("framework")
    table.add_column("verdict")
    table.add_column("pass")
    table.add_column("tighten")
    table.add_column("block")
    for fv in record.framework_verdicts:
        table.add_row(
            fv.framework,
            fv.verdict.value.upper(),
            str(fv.passed),
            str(fv.tightened),
            str(fv.blocked),
        )
    console.print(table)
    console.print(f"[green]Overall verdict:[/green] {record.overall_verdict.value.upper()}")
    console.print(f"[dim]json:[/dim] {json_path}")
    console.print(f"[dim]md:  [/dim] {md_path}")
    if pdf_path:
        console.print(f"[dim]pdf: [/dim] {pdf_path}")
