"""Generate a synthetic deliberately-biased toy model for the equity-audit demo.

Pattern: TPR ~0.71 on IMD-1 (most deprived) → ~0.88 on IMD-5 (least deprived).
Matches the audit treatment-plan fixture so the inspector's TIGHTEN verdict
matches what the doc promised.

Run: `python examples/toy_model/generate.py` from the equity_audit project root.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

OUT_DIR = Path(__file__).resolve().parent

N = 8000
SEED = 42

ETHNIC_GROUPS = [
    "White British",
    "White Other",
    "Black African",
    "South Asian",
    "Mixed",
    "Other",
]
AGE_BANDS = ["18-39", "40-59", "60-74", "75+"]
RURALITY = ["Urban", "Town/Fringe", "Rural"]
IMD = ["1 (most deprived)", "2", "3", "4", "5 (least deprived)"]


def main() -> int:
    rng = np.random.default_rng(SEED)

    n_per_imd = N // 5
    ids = np.arange(N)

    imd = np.repeat(IMD, n_per_imd)

    ethnicity = rng.choice(ETHNIC_GROUPS, size=N, p=[0.55, 0.10, 0.10, 0.10, 0.08, 0.07])
    age_band = rng.choice(AGE_BANDS, size=N, p=[0.32, 0.30, 0.23, 0.15])
    rurality = rng.choice(RURALITY, size=N, p=[0.62, 0.21, 0.17])

    # Latent risk: same true distribution across IMD (we want a model bias, not a base-rate diff).
    true_risk = rng.beta(2.0, 5.0, size=N)
    label = (rng.random(N) < true_risk).astype(int)

    # Bias the predicted score: depress probabilities in lower IMD quintiles.
    # This produces TPR gap without changing label prevalence.
    # Calibrated to land at TIGHTEN — IMD-1 equalized-odds gap ≈ 0.07-0.09.
    imd_to_offset = {
        "1 (most deprived)": -0.035,
        "2": -0.015,
        "3": 0.0,
        "4": 0.010,
        "5 (least deprived)": 0.020,
    }
    offsets = np.array([imd_to_offset[v] for v in imd])
    score = np.clip(true_risk + offsets + rng.normal(0, 0.03, size=N), 0.0, 1.0)

    preds = pd.DataFrame({"id": ids, "score": score, "label": label})
    demo = pd.DataFrame(
        {
            "id": ids,
            "imd_quintile": imd,
            "ethnicity": ethnicity,
            "age_band": age_band,
            "rurality": rurality,
        }
    )

    preds_path = OUT_DIR / "predictions.parquet"
    demo_path = OUT_DIR / "demographics.parquet"
    preds.to_parquet(preds_path, index=False)
    demo.to_parquet(demo_path, index=False)
    print(f"[ok] wrote {preds_path}  ({len(preds)} rows)")
    print(f"[ok] wrote {demo_path}  ({len(demo)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
