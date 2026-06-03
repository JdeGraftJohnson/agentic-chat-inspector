"""Dataset seed — upload the local golden set to LangSmith."""
from __future__ import annotations

import json
from pathlib import Path

from langsmith import Client
from rich.console import Console

from .contracts import GoldenPrompt, GoldenSet

DATASET_NAME = "agentic-chat-inspector-golden-set-v1"
DEFAULT_GOLDEN_PATH = Path(__file__).resolve().parents[3] / "prompts" / "golden-set-v1.json"

console = Console()


def _load_golden_set(path: Path) -> GoldenSet:
    data = json.loads(path.read_text(encoding="utf-8"))
    return GoldenSet.model_validate(data)


def _ensure_dataset(client: Client, description: str) -> str:
    existing = list(client.list_datasets(dataset_name=DATASET_NAME))
    if existing:
        return existing[0].id
    ds = client.create_dataset(dataset_name=DATASET_NAME, description=description)
    return ds.id


def _example_payload(prompt: GoldenPrompt) -> dict:
    return {
        "inputs": {"golden_prompt": prompt.model_dump()},
        "outputs": {"expected_category": prompt.category},
        "metadata": {
            "category": prompt.category,
            "has_expected_tools": bool(prompt.expected_tools),
            "refusal_expected": prompt.refusal_expected,
        },
    }


def seed_dataset(golden_path: Path | None = None) -> dict:
    """Upsert every prompt in the golden set into LangSmith. Idempotent."""
    path = golden_path or DEFAULT_GOLDEN_PATH
    golden = _load_golden_set(path)

    client = Client()
    dataset_id = _ensure_dataset(client, golden.description)

    existing_by_metadata: dict[str, str] = {}
    for ex in client.list_examples(dataset_id=dataset_id):
        if ex.metadata and "prompt_id" in ex.metadata:
            existing_by_metadata[ex.metadata["prompt_id"]] = str(ex.id)

    created = 0
    updated = 0
    for p in golden.prompts:
        payload = _example_payload(p)
        payload["metadata"]["prompt_id"] = p.id
        existing_id = existing_by_metadata.get(p.id)
        if existing_id:
            client.update_example(
                example_id=existing_id,
                inputs=payload["inputs"],
                outputs=payload["outputs"],
                metadata=payload["metadata"],
            )
            updated += 1
        else:
            client.create_example(
                dataset_id=dataset_id,
                inputs=payload["inputs"],
                outputs=payload["outputs"],
                metadata=payload["metadata"],
            )
            created += 1

    return {
        "dataset": DATASET_NAME,
        "dataset_id": dataset_id,
        "version": golden.version,
        "captured_at": golden.captured_at,
        "prompts_total": len(golden.prompts),
        "created": created,
        "updated": updated,
    }
