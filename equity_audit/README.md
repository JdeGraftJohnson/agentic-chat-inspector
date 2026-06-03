# equity-audit

Health-equity fairness audit library. Takes a model's predictions and a
demographics table and emits a structured equity audit report against
**NICE ESF Tier B**, **NHS Core20PLUS5**, and **UK GDPR Article 22**.

Same compliance vocabulary the rest of the [johndegraft.app](https://johndegraft.app)
healthcare portfolio cites — designed to slot into clinical-rag-eval and
the agentic-chat-inspector LangSmith experiment graph as a sixth custom
evaluator.

## Three surfaces, one library

| Surface | Where |
|---|---|
| Python library | `pip install equity-audit` |
| Interactive dashboard | `/equity` route in `agentic-chat-inspector` |
| LangSmith evaluator | `equity_audit.langsmith_plugin.HealthEquityEvaluator` |

## Quickstart

```bash
pip install equity-audit
equity-audit run \
    --predictions examples/toy_model/predictions.parquet \
    --demographics examples/toy_model/demographics.parquet \
    --output-dir /tmp/audit
```

Outputs:

- `audit_report.pdf` — reportlab-rendered, regulator-friendly
- `audit_record.json` — machine-readable governance record (append-only)
- `audit_report.md` — human-readable summary

## What it scores

For each configured slice (`imd_quintile`, `ethnicity`, `age_band`, `rurality`):

- **Equalized-odds difference** — TPR + FPR delta vs reference baseline
- **Demographic parity difference** — selection-rate gap
- **Calibration gap** — observed-vs-predicted probability delta
- **False-negative-rate gap** — slice-specific FNR vs baseline
- **Threshold sensitivity** — verdict change under ±0.05 threshold sweep

Each metric is checked against the configured **framework thresholds**:

- `nice_esf_tier_b.yml` — UK NICE Evidence Standards Framework Tier B
- `core20plus5.yml` — NHS most-deprived-quintile audit pattern
- `gdpr_article22.yml` — meaningful human review + right-to-explanation
- `hipaa.yml` — US HIPAA Security + Privacy Rule mapping per NIST SP 800-66r2
  (Feb 2024). Covers Risk Analysis (§164.308(a)(1)), Audit Controls
  (§164.312(b)), Integrity (§164.312(c)(1)), De-identification (§164.514(b)),
  Minimum Necessary (§164.502(b)), and Right of Access (§164.524).

Severity bands: **Pass / Tighten / Block**. Anything Block is hard-fail;
Tighten requires a documented mitigation in the governance record.

## Disclaimer

This is a tooling library, not a substitute for clinical or compliance
sign-off. NICE / NHS England / ICO do not endorse it. Outputs are
auditor-aid, not auditor-replacement.
