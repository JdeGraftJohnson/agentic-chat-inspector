"""Converters between LangSmith Run/Example and clinical_rag_eval types."""
from __future__ import annotations

import re
from typing import Any

from clinical_rag_eval.types import EvalCase, RagAnswer, RagCitation

from .contracts import GoldenPrompt

DOI_PATTERN = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Za-z0-9]+\b")
PMID_PATTERN = re.compile(r"\bPMID[:\s]+(\d+)\b|\b(\d{6,9})\b")
NICE_PATTERN = re.compile(r"\b(N[GIQ]\d{1,4}|QS\d{1,4}|TA\d{1,4}|CG\d{1,4})\b")


def extract_citations(answer_md: str) -> list[RagCitation]:
    """Pull DOI / PMID / NICE-ID citations out of free-text Markdown."""
    out: list[RagCitation] = []
    for m in DOI_PATTERN.finditer(answer_md):
        out.append(RagCitation(doi=m.group(0)))
    for m in NICE_PATTERN.finditer(answer_md):
        # Reuse the doi field as a free-text canonical ID slot.
        out.append(RagCitation(doi=m.group(1)))
    # PMIDs only if explicitly tagged — bare 6+ digit numbers are too noisy.
    for m in re.finditer(r"PMID[:\s]+(\d+)", answer_md):
        out.append(RagCitation(doi=f"PMID:{m.group(1)}"))
    return out


def output_to_rag_answer(
    prompt: GoldenPrompt,
    answer_md: str,
    refusal: bool | None = None,
) -> RagAnswer:
    """Coerce a chat turn into the RagAnswer shape clinical-rag-eval judges expect."""
    return RagAnswer(
        question_id=prompt.id,
        question=prompt.prompt,
        answer_md=answer_md,
        citations=extract_citations(answer_md),
        refusal=bool(refusal) if refusal is not None else False,
    )


def prompt_to_eval_case(prompt: GoldenPrompt) -> EvalCase:
    return EvalCase(
        id=prompt.id,
        question=prompt.prompt,
        expected_citations=prompt.expected_citations,
        must_mention=prompt.must_mention,
        refusal_expected=prompt.refusal_expected,
        notes=prompt.notes,
    )


def run_to_text_and_tools(run_outputs: dict[str, Any]) -> tuple[str, list[dict]]:
    """Best-effort extraction of (answer_text, tool_calls) from a LangSmith Run.outputs.

    The target function is in our control, so it returns TargetOutput in
    outputs.dump (or outputs directly). This helper handles both shapes.
    """
    if not run_outputs:
        return "", []
    if "answer_md" in run_outputs:
        return run_outputs.get("answer_md", ""), run_outputs.get("tool_calls", []) or []
    # Fall back to text-shaped outputs.
    text = run_outputs.get("text") or run_outputs.get("output") or ""
    return str(text), []
