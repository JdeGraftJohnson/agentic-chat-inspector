"""Slice-level metric computation via fairlearn."""
from __future__ import annotations

import numpy as np
import pandas as pd
from fairlearn.metrics import (
    MetricFrame,
    false_negative_rate,
    false_positive_rate,
    selection_rate,
    true_positive_rate,
)

from ..types import SliceMetric, SliceResult, Verdict
from .thresholds import bucket_verdict


def _calibration_gap(y_true: np.ndarray, y_score: np.ndarray) -> float:
    """Mean |predicted_prob - observed_rate| in 10 equal-frequency buckets."""
    if y_score.std() < 1e-9 or len(y_score) < 10:
        return 0.0
    quantiles = np.linspace(0, 1, 11)
    edges = np.quantile(y_score, quantiles)
    edges[0] -= 1e-9
    bins = np.digitize(y_score, edges, right=True) - 1
    bins = np.clip(bins, 0, 9)
    gaps = []
    for b in range(10):
        mask = bins == b
        if mask.sum() == 0:
            continue
        gaps.append(abs(y_score[mask].mean() - y_true[mask].mean()))
    return float(np.mean(gaps)) if gaps else 0.0


def compute_slice(
    *,
    axis: str,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_score: np.ndarray,
    sensitive_features: pd.Series,
    baseline_label: str | None = None,
) -> SliceResult:
    """Compute equalized-odds, demographic-parity, calibration-gap, FNR-gap
    per slice value, vs a baseline value (most-favored group)."""
    frame = MetricFrame(
        metrics={
            "tpr": true_positive_rate,
            "fpr": false_positive_rate,
            "fnr": false_negative_rate,
            "selection": selection_rate,
        },
        y_true=y_true,
        y_pred=y_pred,
        sensitive_features=sensitive_features,
    )
    by_group = frame.by_group  # DataFrame indexed by sensitive value

    # Choose baseline = highest selection-rate group if not specified.
    if baseline_label is None:
        baseline_label = str(by_group["selection"].idxmax())

    base_tpr = float(by_group.loc[baseline_label, "tpr"])
    base_fpr = float(by_group.loc[baseline_label, "fpr"])
    base_fnr = float(by_group.loc[baseline_label, "fnr"])
    base_selection = float(by_group.loc[baseline_label, "selection"])

    # Calibration is computed per group from y_score.
    df = pd.DataFrame(
        {
            "y_true": y_true,
            "y_score": y_score,
            "group": sensitive_features.values,
        }
    )
    cal_gap_by_group: dict[str, float] = {}
    for label, sub in df.groupby("group"):
        cal_gap_by_group[str(label)] = _calibration_gap(
            sub["y_true"].to_numpy(dtype=float),
            sub["y_score"].to_numpy(dtype=float),
        )
    base_cal = cal_gap_by_group.get(baseline_label, 0.0)

    cells: list[SliceMetric] = []
    for label, row in by_group.iterrows():
        s = str(label)
        n = int((sensitive_features == label).sum())
        # equalized-odds = max(|TPR - base_TPR|, |FPR - base_FPR|)
        eo_delta = max(abs(row["tpr"] - base_tpr), abs(row["fpr"] - base_fpr))
        dp_delta = row["selection"] - base_selection
        cal_delta = cal_gap_by_group.get(s, 0.0) - base_cal
        fnr_delta = row["fnr"] - base_fnr

        for metric, val, delta in [
            ("equalized_odds", eo_delta, eo_delta),
            ("demographic_parity", row["selection"], dp_delta),
            ("calibration_gap", cal_gap_by_group.get(s, 0.0), cal_delta),
            ("fnr_gap", row["fnr"], fnr_delta),
        ]:
            cells.append(
                SliceMetric(
                    label=s,
                    n=n,
                    metric=metric,  # type: ignore[arg-type]
                    value=float(val),
                    delta_vs_baseline=float(delta),
                    verdict=bucket_verdict(metric, abs(float(delta))),
                )
            )

    worst = max(
        (c.verdict for c in cells),
        key=lambda v: [Verdict.PASS, Verdict.TIGHTEN, Verdict.BLOCK].index(v),
    )
    return SliceResult(
        axis=axis,
        baseline_label=baseline_label,
        cells=cells,
        worst_verdict=worst,
    )
