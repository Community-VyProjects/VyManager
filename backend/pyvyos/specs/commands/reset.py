"""Pydantic models for reset operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class ResetRequest(ApiRequest):
        """Request model for reset operation."""
        
        op: Literal["reset"] = "reset"
        path: Optional[List[str]] = None

