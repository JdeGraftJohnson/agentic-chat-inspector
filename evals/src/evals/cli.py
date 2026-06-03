"""Typer CLI: `seed-dataset` and `run-experiment`."""
from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Table

from .dataset import seed_dataset
from .experiment import run_experiment

app_seed = typer.Typer(no_args_is_help=False, add_completion=False)
app_experiment = typer.Typer(no_args_is_help=False, add_completion=False)
console = Console()


@app_seed.command()
def seed(
    golden_path: Annotated[
        Path | None,
        typer.Option(
            help="Path to a golden-set JSON. Defaults to prompts/golden-set-v1.json.",
        ),
    ] = None,
) -> None:
    """Upsert the local golden set into LangSmith. Idempotent."""
    result = seed_dataset(golden_path)
    table = Table(title="LangSmith dataset seeded")
    for k, v in result.items():
        table.add_row(str(k), str(v))
    console.print(table)


@app_experiment.command()
def experiment(
    target_url: Annotated[
        str,
        typer.Option(help="Where /api/chat is reachable. Local dev or deployed URL."),
    ] = "http://localhost:3000/api/chat",
    providers: Annotated[
        str,
        typer.Option(
            help="Comma-separated provider IDs. One LangSmith experiment per provider.",
        ),
    ] = "claude-subscription",
    max_concurrency: Annotated[int, typer.Option(min=1, max=8)] = 4,
) -> None:
    """Run langsmith.evaluate() over the golden set across the given providers."""
    provider_list = [p.strip() for p in providers.split(",") if p.strip()]
    runs = run_experiment(
        target_url=target_url,
        providers=provider_list,
        max_concurrency=max_concurrency,
    )
    table = Table(title="Experiments fired")
    table.add_column("provider")
    table.add_column("experiment")
    table.add_column("url")
    for r in runs:
        table.add_row(r["provider"], r["experiment_name"], r.get("experiment_url") or "—")
    console.print(table)


# Typer-as-entrypoint shims (pyproject.toml [project.scripts]).
def seed_main() -> None:
    app_seed()


def experiment_main() -> None:
    app_experiment()
