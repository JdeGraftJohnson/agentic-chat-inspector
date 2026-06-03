"""fairlearn-backed metric wrappers."""
from .compute import compute_slice
from .thresholds import bucket_verdict, default_thresholds

__all__ = ["compute_slice", "bucket_verdict", "default_thresholds"]
