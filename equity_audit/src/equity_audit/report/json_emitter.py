from __future__ import annotations

import json
from pathlib import Path

from ..types import AuditRecord


def write_json(record: AuditRecord, out_path: Path) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
    # Sanity round-trip
    json.loads(out_path.read_text(encoding="utf-8"))
    return out_path
