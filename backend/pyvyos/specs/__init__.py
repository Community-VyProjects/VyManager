"""PyVyOS Pydantic specs for optional request/response validation."""

# Feature detection: gracefully degrade if pydantic not available
try:
    from pydantic import BaseModel
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False
    BaseModel = None  # type: ignore

__all__ = ["PYDANTIC_AVAILABLE"]

