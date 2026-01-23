"""Pydantic models for retrieve operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class RetrieveShowConfigRequest(ApiRequest):
        """Request model for retrieve showConfig operation."""
        
        op: Literal["showConfig"] = "showConfig"
        path: Optional[List[str]] = None


    class RetrieveReturnValuesRequest(ApiRequest):
        """Request model for retrieve returnValues operation."""
        
        op: Literal["returnValues"] = "returnValues"
        path: Optional[List[str]] = None

