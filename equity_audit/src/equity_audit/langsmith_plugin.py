"""LangSmith evaluator plugin — equity.demographic_parity.

When invoked on a chat run whose outputs include an audit_record (the
chat asked the agent to perform an equity audit and the tool returned a
structured AuditRecord), this evaluator returns the worst slice's
demographic-parity delta as a 0..1 score. Smaller delta = higher score.

The evaluator is no-op (score=None) for runs that don't carry an audit
record, so it can coexist with the other 5 evaluators without polluting
their aggregates.
"""
from __future__ import annotations

from typing import Any

from .types import AuditRecord, SliceResult, Verdict

EVALUATOR_KEY = "equity.demographic_parity"

VERDICT_FLOOR = {
    Verdict.PASS: 1.0,
    Verdict.TIGHTEN: 0.6,
    Verdict.BLOCK: 0.0,
}


def _worst_dp(slices: list[SliceResult]) -> tuple[float, str] | None:
    worst: tuple[float, str] | None = None
    for sl in slices:
        for c in sl.cells:
            if c.metric != "demographic_parity":
                continue
            d = abs(c.delta_vs_baseline)
            if worst is None or d > worst[0]:
                worst = (d, f"{sl.axis}:{c.label}")
    return worst


def health_equity_evaluator(run: Any, example: Any) -> dict[str, Any]:
    outputs = getattr(run, "outputs", {}) or {}
    raw = outputs.get("audit_record")
    if not raw:
        return {
            "key": EVALUATOR_KEY,
            "score": None,
            "comment": "no audit_record in run outputs (n/a)",
        }
    try:
        record = AuditRecord.model_validate(raw)
    except Exception as exc:
        return {
            "key": EVALUATOR_KEY,
            "score": 0.0,
            "comment": f"malformed audit_record: {exc}",
        }

    worst = _worst_dp(record.slices)
    if worst is None:
        return {
            "key": EVALUATOR_KEY,
            "score": 1.0,
            "comment": "audit had no demographic_parity cells",
        }

    delta, where = worst
    floor = VERDICT_FLOOR[record.overall_verdict]
    score = max(floor, 1.0 - 10.0 * delta)  # 0.1 delta -> 0.0 ceiling
    return {
        "key": EVALUATOR_KEY,
        "score": round(score, 4),
        "comment": f"worst demographic-parity delta {delta:+.3f} at {where}; overall {record.overall_verdict.value}",
    }


HealthEquityEvaluator = health_equity_evaluator
