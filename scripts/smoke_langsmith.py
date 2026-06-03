"""One-shot smoke test for LANGSMITH_API_KEY: list project + create one tagged run.

Run with: `uv run --project evals python scripts/smoke_langsmith.py`
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

from langsmith import Client


def main() -> int:
    if not os.environ.get("LANGSMITH_API_KEY"):
        print("LANGSMITH_API_KEY not set; refusing to run.", file=sys.stderr)
        return 2

    client = Client()
    project = os.environ.get("LANGSMITH_PROJECT", "agentic-chat-inspector")

    # Smoke 1 — auth works
    me = client.list_datasets(limit=1)
    list(me)  # force eager pull
    print(f"[ok] LangSmith auth ok")

    # Smoke 2 — write one run so we can confirm in the UI
    run_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    client.create_run(
        id=run_id,
        name="smoke.m3a.preflight",
        run_type="chain",
        inputs={"check": "preflight"},
        outputs={"status": "ok"},
        start_time=now,
        end_time=now,
        project_name=project,
        tags=["preflight", "m3a"],
    )
    print(f"[ok] wrote run {run_id} to project {project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
