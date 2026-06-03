"""Severity-band thresholds. Conservative defaults; override per audit."""
from __future__ import annotations

from typing import Mapping

from ..types import Verdict


def default_thresholds() -> dict[str, dict[Verdict, float]]:
    """{metric_name: {Verdict: upper_bound}} — abs deltas above blocked threshold = BLOCK."""
    return {
        "equalized_odds": {
            Verdict.PASS: 0.05,
            Verdict.TIGHTEN: 0.10,
            Verdict.BLOCK: float("inf"),
        },
        "demographic_parity": {
            Verdict.PASS: 0.05,
            Verdict.TIGHTEN: 0.10,
            Verdict.BLOCK: float("inf"),
        },
        "calibration_gap": {
            Verdict.PASS: 0.05,
            Verdict.TIGHTEN: 0.10,
            Verdict.BLOCK: float("inf"),
        },
        "fnr_gap": {
            Verdict.PASS: 0.05,
            Verdict.TIGHTEN: 0.10,
            Verdict.BLOCK: float("inf"),
        },
    }


def bucket_verdict(
    metric: str,
    abs_delta: float,
    thresholds: Mapping[str, Mapping[Verdict, float]] | None = None,
) -> Verdict:
    t = (thresholds or default_thresholds())[metric]
    if abs_delta <= t[Verdict.PASS]:
        return Verdict.PASS
    if abs_delta <= t[Verdict.TIGHTEN]:
        return Verdict.TIGHTEN
    return Verdict.BLOCK
