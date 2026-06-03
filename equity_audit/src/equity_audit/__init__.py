"""equity-audit — health-equity fairness audit library."""
from importlib.metadata import version as _v

try:
    __version__ = _v("equity-audit")
except Exception:
    __version__ = "0.1.0"

from .types import (
    AuditRecord,
    FrameworkOverlay,
    FrameworkVerdict,
    SliceMetric,
    SliceResult,
    Verdict,
)

__all__ = [
    "AuditRecord",
    "FrameworkOverlay",
    "FrameworkVerdict",
    "SliceMetric",
    "SliceResult",
    "Verdict",
]
