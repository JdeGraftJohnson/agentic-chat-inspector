"""Push system prompts v1 and v2 to LangSmith Prompt Hub.

The hub URL pattern is:
    https://smith.langchain.com/prompts/<owner>/<name>

Each push creates a new commit; the latest commit becomes the head. We tag
each push with a version so /inspector can pin a specific commit if needed.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from langsmith import Client
from langchain_core.prompts import ChatPromptTemplate

PROMPT_NAME = "agentic-chat-inspector-system"
PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"


def _build_template(system_text: str) -> ChatPromptTemplate:
    """Wrap a flat system string into a LangChain ChatPromptTemplate.

    LangSmith Prompt Hub stores ChatPromptTemplates with templated message
    slots; this gives us a {messages} placeholder the client can substitute
    at pull time.
    """
    return ChatPromptTemplate.from_messages(
        [
            ("system", system_text),
            ("placeholder", "{messages}"),
        ]
    )


def push_one(client: Client, version: str, path: Path) -> str:
    system_text = path.read_text(encoding="utf-8").strip()
    template = _build_template(system_text)
    full_name = f"{PROMPT_NAME}-{version}"
    url = client.push_prompt(full_name, object=template)
    return url


def main() -> int:
    if not os.environ.get("LANGSMITH_API_KEY"):
        print("LANGSMITH_API_KEY not set; refusing to push.", file=sys.stderr)
        return 2
    client = Client()
    urls = {}
    for version, filename in [("v1", "system_v1.md"), ("v2", "system_v2.md")]:
        path = PROMPTS_DIR / filename
        urls[version] = push_one(client, version, path)
        print(f"[ok] pushed {version} -> {urls[version]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
