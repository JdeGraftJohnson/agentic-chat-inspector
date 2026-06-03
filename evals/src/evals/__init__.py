"""LangSmith evaluators + dataset seed + experiment runner for agentic-chat-inspector."""
from importlib.metadata import version as _v

try:
    __version__ = _v("agentic-chat-inspector-evals")
except Exception:
    __version__ = "0.1.0"
