"""Top-level audit orchestration."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .frameworks import all_overlays, compute_framework_verdict
from .metrics import compute_slice
from .types import AuditRecord, Verdict

DEFAULT_AXES = ["imd_quintile", "ethnicity", "age_band", "rurality"]


def _read_table(path: Path) -> pd.DataFrame:
    if path.suffix in (".parquet", ".pq"):
        return pd.read_parquet(path)
    if path.suffix in (".csv",):
        return pd.read_csv(path)
    raise ValueError(f"Unsupported extension: {path.suffix}")


def run_audit(
    *,
    predictions_path: Path,
    demographics_path: Path,
    model_name: str = "untitled-model",
    threshold: float = 0.5,
    axes: list[str] | None = None,
) -> AuditRecord:
    preds = _read_table(predictions_path)
    demo = _read_table(demographics_path)

    required_pred_cols = {"id", "score", "label"}
    if not required_pred_cols.issubset(preds.columns):
        raise ValueError(
            f"predictions must contain columns {required_pred_cols}; got {set(preds.columns)}"
        )
    if "id" not in demo.columns:
        raise ValueError("demographics must contain an 'id' column")

    df = preds.merge(demo, on="id", how="inner")
    y_true = df["label"].to_numpy(dtype=float)
    y_score = df["score"].to_numpy(dtype=float)
    y_pred = (y_score >= threshold).astype(int)

    axes_to_run = [a for a in (axes or DEFAULT_AXES) if a in df.columns]
    slices = [
        compute_slice(
            axis=axis,
            y_true=y_true,
            y_pred=y_pred,
            y_score=y_score,
            sensitive_features=df[axis].astype(str),
        )
        for axis in axes_to_run
    ]

    framework_verdicts = [compute_framework_verdict(o, slices) for o in all_overlays()]

    overall = max(
        (fv.verdict for fv in framework_verdicts),
        key=lambda v: [Verdict.PASS, Verdict.TIGHTEN, Verdict.BLOCK].index(v),
        default=Verdict.PASS,
    )

    return AuditRecord(
        model_name=model_name,
        model_auc=_safe_auc(y_true, y_score),
        n_predictions=int(len(df)),
        threshold=threshold,
        slices=slices,
        framework_verdicts=framework_verdicts,
        overall_verdict=overall,
    )


def _safe_auc(y_true: np.ndarray, y_score: np.ndarray) -> float | None:
    try:
        from sklearn.metrics import roc_auc_score

        return float(roc_auc_score(y_true, y_score))
    except Exception:
        return None
