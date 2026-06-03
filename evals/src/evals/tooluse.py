"""Tool-use correctness evaluator.

This is the evaluator that proves the LangSmith experiment table is
agent-aware, not just text-aware. For each golden prompt that declares
`expected_tools`, we score the chat turn on:

1. Were all expected tools called at least once?
2. Did each expected tool call include the expected substring argument(s)?

Score is the fraction of expected_tools that were satisfied. A prompt
with no expected_tools is a no-op (returns score=None, omitted from
aggregates).
"""
from __future__ import annotations

from typing import Any

from .contracts import GoldenPrompt
from .convert import run_to_text_and_tools


def tool_use_correctness_evaluator(run: Any, example: Any) -> dict[str, Any]:
    inputs = example.inputs if hasattr(example, "inputs") else example.get("inputs", {})
    prompt = GoldenPrompt.model_validate(inputs["golden_prompt"])

    if not prompt.expected_tools:
        return {
            "key": "agentic.tool_use_correctness",
            "score": None,
            "comment": "no expected tools (n/a)",
        }

    _, tool_calls = run_to_text_and_tools(getattr(run, "outputs", {}) or {})

    satisfied: list[str] = []
    missing: list[str] = []
    arg_mismatches: list[str] = []

    for expected in prompt.expected_tools:
        matches = [c for c in tool_calls if c.get("name") == expected.name]
        if not matches:
            missing.append(expected.name)
            continue

        if not expected.arg_match:
            satisfied.append(expected.name)
            continue

        ok = False
        for c in matches:
            args = c.get("args") or c.get("arguments") or {}
            args_str = " ".join(f"{k}={v}" for k, v in args.items()).lower()
            if all(needle.lower() in args_str for needle in expected.arg_match.values()):
                ok = True
                break
        if ok:
            satisfied.append(expected.name)
        else:
            arg_mismatches.append(expected.name)

    total = len(prompt.expected_tools)
    score = len(satisfied) / total if total else 1.0

    comment_parts = []
    if satisfied:
        comment_parts.append(f"satisfied: {', '.join(satisfied)}")
    if missing:
        comment_parts.append(f"missing: {', '.join(missing)}")
    if arg_mismatches:
        comment_parts.append(f"arg-mismatch: {', '.join(arg_mismatches)}")

    return {
        "key": "agentic.tool_use_correctness",
        "score": round(score, 4),
        "comment": "; ".join(comment_parts) or "ok",
    }
