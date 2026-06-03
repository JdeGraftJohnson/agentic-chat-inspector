"""Thin shim — `uv run scripts/seed_langsmith_dataset.py` calls evals.cli.seed."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "evals" / "src"))

from evals.cli import seed_main  # noqa: E402

if __name__ == "__main__":
    seed_main()
