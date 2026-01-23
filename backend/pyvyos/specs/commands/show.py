"""Pydantic models for show operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class ShowRequest(ApiRequest):
        """Request model for show operation."""
        
        op: Literal["show"] = "show"
        path: Optional[List[str]] = None

