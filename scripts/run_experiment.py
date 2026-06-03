"""Thin shim — `uv run scripts/run_experiment.py` calls evals.cli.experiment."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "evals" / "src"))

from evals.cli import experiment_main  # noqa: E402

if __name__ == "__main__":
    experiment_main()
