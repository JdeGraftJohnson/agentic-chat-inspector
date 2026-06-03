"""Target function — calls the Next.js /api/chat endpoint and assembles output.

The target reads the SSE stream emitted by toUIMessageStreamResponse,
collects every text-delta and tool-call event, and returns a structured
TargetOutput that the evaluators understand.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from .contracts import GoldenPrompt, TargetOutput


def _make_user_message(prompt: GoldenPrompt) -> dict:
    return {
        "id": prompt.id,
        "role": "user",
        "parts": [{"type": "text", "text": prompt.prompt}],
    }


def run_chat_target(
    inputs: dict[str, Any],
    *,
    target_url: str,
    provider: str,
    timeout_s: float = 120.0,
    model_label_hint: str | None = None,
) -> dict[str, Any]:
    """Send a golden prompt to the Next.js /api/chat route and assemble output.

    LangSmith's evaluate() calls this with one inputs dict per Example.
    """
    prompt = GoldenPrompt.model_validate(inputs["golden_prompt"])
    body = {
        "messages": [_make_user_message(prompt)],
        "provider": provider,
    }

    text_chunks: list[str] = []
    tool_calls: list[dict] = []
    seen_tool_call_ids: set[str] = set()
    model_label = model_label_hint or provider

    with httpx.Client(timeout=timeout_s) as client:
        with client.stream("POST", target_url, json=body) as resp:
            resp.raise_for_status()
            model_label = resp.headers.get("X-Model", model_label)
            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]" or not payload:
                    continue
                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue

                event_type = event.get("type")
                if event_type == "text-delta":
                    text_chunks.append(event.get("delta", ""))
                elif event_type == "tool-input-available":
                    call_id = event.get("toolCallId") or event.get("id") or ""
                    if call_id in seen_tool_call_ids:
                        continue
                    seen_tool_call_ids.add(call_id)
                    tool_calls.append(
                        {
                            "name": event.get("toolName") or event.get("name"),
                            "args": event.get("input") or event.get("args") or {},
                            "tool_call_id": call_id,
                        }
                    )

    out = TargetOutput(
        answer_md="".join(text_chunks),
        tool_calls=tool_calls,
        provider=provider,
        model_label=model_label,
    )
    return out.model_dump()
