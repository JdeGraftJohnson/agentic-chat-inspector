"""Run a LangSmith experiment over the golden set across N providers."""
from __future__ import annotations

import os
import subprocess
from functools import partial
from typing import Any

from langsmith import Client
from langsmith.evaluation import evaluate

from equity_audit.langsmith_plugin import HealthEquityEvaluator

from .clinical import CLINICAL_EVALUATORS
from .dataset import DATASET_NAME
from .online import online_leakage_evaluator
from .target import run_chat_target
from .tooluse import tool_use_correctness_evaluator

EVALUATORS = [
    *CLINICAL_EVALUATORS,
    tool_use_correctness_evaluator,
    HealthEquityEvaluator,
    online_leakage_evaluator,
]


def _short_sha() -> str:
    sha = os.environ.get("GIT_SHA")
    if sha:
        return sha[:7]
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], text=True
        ).strip()
    except Exception:
        return "dev"


def run_experiment(
    *,
    target_url: str,
    providers: list[str],
    max_concurrency: int = 4,
) -> list[dict[str, Any]]:
    Client()  # validates LANGSMITH_API_KEY is present

    sha = _short_sha()
    runs: list[dict[str, Any]] = []
    for provider in providers:
        experiment_name = f"golden-set-v1-{provider}-{sha}"
        target = partial(
            run_chat_target,
            target_url=target_url,
            provider=provider,
        )
        result = evaluate(
            target,
            data=DATASET_NAME,
            evaluators=EVALUATORS,
            experiment_prefix=experiment_name,
            max_concurrency=max_concurrency,
            metadata={
                "provider": provider,
                "target_url": target_url,
                "git_sha": sha,
            },
        )
        runs.append(
            {
                "provider": provider,
                "experiment_name": experiment_name,
                "experiment_url": getattr(result, "experiment_url", None),
            }
        )
    return runs
