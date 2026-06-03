"""Framework overlay loaders + verdict computation."""
from __future__ import annotations

from importlib.resources import files
from typing import Iterable

import yaml

from ..types import (
    FrameworkItem,
    FrameworkOverlay,
    FrameworkVerdict,
    SliceResult,
    Verdict,
)

FRAMEWORK_FILES = {
    "NICE ESF Tier B": "nice_esf_tier_b.yml",
    "NHS Core20PLUS5": "core20plus5.yml",
    "UK GDPR Article 22": "gdpr_article22.yml",
    "HIPAA (US)": "hipaa.yml",
}


def load_overlay(framework: str) -> FrameworkOverlay:
    filename = FRAMEWORK_FILES.get(framework)
    if filename is None:
        raise KeyError(f"Unknown framework {framework!r}")
    raw = (files("equity_audit.frameworks") / filename).read_text(encoding="utf-8")
    data = yaml.safe_load(raw)
    items = [
        FrameworkItem(id=it["id"], description=it["description"], status=Verdict.PASS)
        for it in data["items"]
    ]
    return FrameworkOverlay(framework=data["framework"], version=str(data["version"]), items=items)


def all_overlays() -> Iterable[FrameworkOverlay]:
    for name in FRAMEWORK_FILES:
        yield load_overlay(name)


def compute_framework_verdict(
    overlay: FrameworkOverlay, slices: list[SliceResult]
) -> FrameworkVerdict:
    """Map specific framework items to specific slice findings.

    Default is PASS — only items that explicitly correspond to a measured
    slice axis adopt that slice's verdict. Items about process (audit logs,
    right of access, minimum-necessary, etc.) stay PASS unless explicitly
    overridden — they are not derivable from prediction parquet alone.
    """
    imd_slice = next((s for s in slices if s.axis == "imd_quintile"), None)
    eth_slice = next((s for s in slices if s.axis == "ethnicity"), None)

    def _worst_eo_for(slice_: SliceResult | None) -> tuple[Verdict, float] | None:
        if slice_ is None:
            return None
        eos = [c for c in slice_.cells if c.metric == "equalized_odds"]
        if not eos:
            return None
        worst = max(eos, key=lambda c: abs(c.delta_vs_baseline))
        return worst.verdict, worst.delta_vs_baseline

    def _worst_overall_for(slice_: SliceResult | None) -> tuple[Verdict, str] | None:
        if slice_ is None:
            return None
        worst = max(
            slice_.cells,
            key=lambda c: [Verdict.PASS, Verdict.TIGHTEN, Verdict.BLOCK].index(c.verdict),
        )
        return worst.verdict, f"{worst.metric}={worst.value:+.3f} Δ={worst.delta_vs_baseline:+.3f}"

    # Per-item rules: (item id substrings → slice finding to bind)
    BIND_TO_IMD1_EO = {"B.4.1", "B.4.2", "C20.2"}
    BIND_TO_ETHNIC = {"PLUS.ETHNIC"}

    items: list[FrameworkItem] = []
    for it in overlay.items:
        status = Verdict.PASS
        note: str | None = None
        if it.id in BIND_TO_IMD1_EO:
            result = _worst_eo_for(imd_slice)
            if result is not None:
                status, delta = result
                note = f"IMD equalized-odds worst delta = {delta:+.3f}"
        elif it.id in BIND_TO_ETHNIC:
            result = _worst_overall_for(eth_slice)
            if result is not None:
                status, summary = result
                note = f"Ethnicity worst cell: {summary}"
        items.append(
            FrameworkItem(
                id=it.id,
                description=it.description,
                status=status,
                note=note,
            )
        )

    passed = sum(1 for x in items if x.status == Verdict.PASS)
    tightened = sum(1 for x in items if x.status == Verdict.TIGHTEN)
    blocked = sum(1 for x in items if x.status == Verdict.BLOCK)
    if blocked > 0:
        verdict = Verdict.BLOCK
    elif tightened > 0:
        verdict = Verdict.TIGHTEN
    else:
        verdict = Verdict.PASS

    return FrameworkVerdict(
        framework=overlay.framework,
        verdict=verdict,
        passed=passed,
        tightened=tightened,
        blocked=blocked,
        items=items,
    )
