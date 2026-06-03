"""Four LangSmith evaluators that wrap clinical-rag-eval judges.

Each evaluator:
- Receives the LangSmith Run (our chat turn) and Example (golden prompt).
- Converts them to (RagAnswer, EvalCase).
- Calls the underlying judge.
- Reduces the list of JudgeFinding into a single EvaluationResult per dimension.

We keep evaluator IDs stable across versions so the LangSmith experiment
comparison view stays meaningful: `clinical.citation_coverage`,
`clinical.must_mention`, `clinical.refusal_consistency`,
`clinical.faithfulness`.
"""
from __future__ import annotations

from typing import Any

from clinical_rag_eval.judges.deterministic.citation_coverage import (
    judge_citation_coverage,
)
from clinical_rag_eval.judges.deterministic.must_mention import judge_must_mention
from clinical_rag_eval.judges.deterministic.refusal_consistency import (
    judge_refusal_consistency,
)
from clinical_rag_eval.judges.llm.faithfulness import judge_faithfulness
from clinical_rag_eval.types import JudgeFinding, JudgeSeverity

from .contracts import GoldenPrompt
from .convert import output_to_rag_answer, prompt_to_eval_case, run_to_text_and_tools

SEVERITY_SCORE = {
    JudgeSeverity.PASS: 1.0,
    JudgeSeverity.SUGGESTION: 0.75,
    JudgeSeverity.IMPORTANT: 0.4,
    JudgeSeverity.CRITICAL: 0.0,
}


def _reduce(findings: list[JudgeFinding], evaluator_id: str) -> dict[str, Any]:
    """Reduce a JudgeFinding list to one LangSmith EvaluationResult dict."""
    if not findings:
        return {
            "key": evaluator_id,
            "score": 1.0,
            "comment": "no findings (pass)",
        }
    scored = [
        f.score if f.score is not None else SEVERITY_SCORE[f.severity]
        for f in findings
    ]
    score = sum(scored) / len(scored)
    worst = min(findings, key=lambda f: SEVERITY_SCORE[f.severity])
    return {
        "key": evaluator_id,
        "score": round(score, 4),
        "comment": f"{worst.severity.value}: {worst.message}",
    }


def _materialize(run: Any, example: Any) -> tuple[GoldenPrompt, str, bool]:
    inputs = example.inputs if hasattr(example, "inputs") else example.get("inputs", {})
    prompt = GoldenPrompt.model_validate(inputs["golden_prompt"])
    text, _ = run_to_text_and_tools(getattr(run, "outputs", {}) or {})
    refusal = bool((getattr(run, "outputs", {}) or {}).get("refusal", False))
    return prompt, text, refusal


def citation_coverage_evaluator(run: Any, example: Any) -> dict[str, Any]:
    prompt, text, refusal = _materialize(run, example)
    answer = output_to_rag_answer(prompt, text, refusal)
    findings = judge_citation_coverage(case=prompt_to_eval_case(prompt), answer=answer)
    return _reduce(findings, "clinical.citation_coverage")


def must_mention_evaluator(run: Any, example: Any) -> dict[str, Any]:
    prompt, text, refusal = _materialize(run, example)
    answer = output_to_rag_answer(prompt, text, refusal)
    findings = judge_must_mention(case=prompt_to_eval_case(prompt), answer=answer)
    return _reduce(findings, "clinical.must_mention")


def refusal_consistency_evaluator(run: Any, example: Any) -> dict[str, Any]:
    prompt, text, refusal = _materialize(run, example)
    answer = output_to_rag_answer(prompt, text, refusal)
    findings = judge_refusal_consistency(
        case=prompt_to_eval_case(prompt), answer=answer
    )
    return _reduce(findings, "clinical.refusal_consistency")


def faithfulness_evaluator(run: Any, example: Any) -> dict[str, Any]:
    """LLM-as-judge faithfulness. Runs only if the underlying judge can call its LLM.

    The clinical-rag-eval LLM judge handles its own LLM client config. If
    no client is wired in this process, the judge returns a single PASS
    finding (no-op) — which we surface as a 1.0 score with a comment so it
    is visible in the LangSmith table.
    """
    prompt, text, refusal = _materialize(run, example)
    answer = output_to_rag_answer(prompt, text, refusal)
    try:
        findings = judge_faithfulness(case=prompt_to_eval_case(prompt), answer=answer)
    except Exception as exc:
        return {
            "key": "clinical.faithfulness",
            "score": None,
            "comment": f"faithfulness judge errored: {exc}",
        }
    return _reduce(findings, "clinical.faithfulness")


CLINICAL_EVALUATORS = [
    citation_coverage_evaluator,
    must_mention_evaluator,
    refusal_consistency_evaluator,
    faithfulness_evaluator,
]
