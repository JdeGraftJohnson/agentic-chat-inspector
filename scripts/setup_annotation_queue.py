"""Create the annotation queue on LangSmith if it does not already exist.

Auto-routing (low tool-use-correctness -> queue) is enforced application-side
in app/api/chat/route.ts. This script just ensures the queue object exists.
"""
from __future__ import annotations

import os
import sys

from langsmith import Client

QUEUE_NAME = "agentic-chat-inspector-tool-use-review"


def main() -> int:
    if not os.environ.get("LANGSMITH_API_KEY"):
        print("LANGSMITH_API_KEY not set; refusing to run.", file=sys.stderr)
        return 2
    client = Client()
    existing = list(client.list_annotation_queues(name=QUEUE_NAME))
    if existing:
        q = existing[0]
        print(f"[ok] queue already exists: {q.id} ({QUEUE_NAME})")
        return 0
    q = client.create_annotation_queue(
        name=QUEUE_NAME,
        description=(
            "Auto-routed runs where the agent's tool use was weak: any chat "
            "turn whose agentic.tool_use_correctness score < 0.6, OR whose "
            "online.phi_secret_leakage score < 1.0. Reviewer is asked to "
            "label the run on two axes — was the right tool reachable, and "
            "did the agent attempt it."
        ),
    )
    print(f"[ok] queue created: {q.id} ({QUEUE_NAME})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
