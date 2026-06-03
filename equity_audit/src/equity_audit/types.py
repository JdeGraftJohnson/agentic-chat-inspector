"""Data contracts for equity audits."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Verdict(str, Enum):
    PASS = "pass"
    TIGHTEN = "tighten"
    BLOCK = "block"


class SliceMetric(BaseModel):
    """One metric for one slice value."""

    label: str
    n: int
    metric: Literal[
        "equalized_odds",
        "demographic_parity",
        "calibration_gap",
        "fnr_gap",
    ]
    value: float
    delta_vs_baseline: float
    verdict: Verdict


class SliceResult(BaseModel):
    """All metrics for one slice axis (IMD / ethnicity / age_band / rurality)."""

    axis: str
    baseline_label: str
    cells: list[SliceMetric]
    worst_verdict: Verdict


class FrameworkItem(BaseModel):
    id: str
    description: str
    status: Verdict
    note: str | None = None


class FrameworkVerdict(BaseModel):
    framework: str
    verdict: Verdict
    passed: int
    tightened: int
    blocked: int
    items: list[FrameworkItem]


class FrameworkOverlay(BaseModel):
    """Loaded YAML overlay for one framework (NICE ESF Tier B etc.)."""

    framework: str
    version: str
    items: list[FrameworkItem]


class AuditRecord(BaseModel):
    """Top-level machine-readable governance record."""

    version: str = "1.0"
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    model_name: str
    model_auc: float | None = None
    n_predictions: int
    threshold: float
    slices: list[SliceResult]
    framework_verdicts: list[FrameworkVerdict]
    overall_verdict: Verdict
    notes: str | None = None
