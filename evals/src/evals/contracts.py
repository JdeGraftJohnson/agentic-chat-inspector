"""Data contracts for the LangSmith golden set and target-function output.

The dataset format is versioned. v1 was authored 2026-06-02. Changes
require a new file name (golden-set-v2.json) so the LangSmith Dataset
version pin stays meaningful.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExpectedTool(BaseModel):
    """One MCP tool the chat agent is expected to call."""

    name: str = Field(description="Fully-qualified MCP tool name, e.g. pubmed.search")
    arg_match: dict[str, str] = Field(
        default_factory=dict,
        description="Substring matches for tool args. Each value must be a substring of the actual arg.",
    )


class GoldenPrompt(BaseModel):
    """One example in the golden set.

    Shape is designed to be uploaded as a LangSmith Example with:
        inputs  = {"messages": [{"role": "user", "content": prompt}], "tags": tags}
        outputs = (expected eval signal, used by evaluators only)
    """

    id: str
    category: Literal["rag", "write", "refusal", "trap"]
    prompt: str
    expected_citations: list[str] = Field(
        default_factory=list,
        description="DOIs / PMIDs / NICE IDs that MUST appear in the answer.",
    )
    must_mention: list[str] = Field(
        default_factory=list,
        description="Plain-text terms that MUST appear in the answer.",
    )
    expected_tools: list[ExpectedTool] = Field(default_factory=list)
    refusal_expected: bool = False
    notes: str | None = None


class GoldenSet(BaseModel):
    version: str
    captured_at: str
    description: str
    prompts: list[GoldenPrompt]


class TargetOutput(BaseModel):
    """Shape produced by run_chat_target for evaluators to inspect."""

    answer_md: str
    tool_calls: list[dict] = Field(default_factory=list)
    provider: str
    model_label: str
    run_id: str | None = None
