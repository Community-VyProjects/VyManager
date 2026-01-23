"""Pydantic models for config-file operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel, Field
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    Field = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class ConfigFileSaveRequest(ApiRequest):
        """Request model for config-file save operation."""
        
        op: Literal["save"] = "save"
        path: List[str] = Field(
            default_factory=list,
            description="Required by VyOS API, typically empty array"
        )
        file: Optional[str] = None


    class ConfigFileLoadRequest(ApiRequest):
        """Request model for config-file load operation."""
        
        op: Literal["load"] = "load"
        path: List[str] = Field(
            default_factory=list,
            description="Required by VyOS API, typically empty array"
        )
        file: str  # Required for load

