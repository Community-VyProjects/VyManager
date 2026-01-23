"""Pydantic models for generate operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class GenerateRequest(ApiRequest):
        """Request model for generate operation."""
        
        op: Literal["generate"] = "generate"
        path: Optional[List[str]] = None

