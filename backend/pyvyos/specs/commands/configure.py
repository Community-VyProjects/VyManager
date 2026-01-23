"""Pydantic models for configure operations."""

from typing import Dict, List, Literal, Union, Any

try:
    from pydantic import BaseModel, Field
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    Field = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class ConfigureSetRequest(ApiRequest):
        """Request model for configure set operation."""
        
        op: Literal["set"] = "set"
        path: Union[List[str], List[List[str]]]  # Required


    class ConfigureDeleteRequest(ApiRequest):
        """Request model for configure delete operation."""
        
        op: Literal["delete"] = "delete"
        path: List[str]  # Required


    class ConfigureMultipleOpRequest(BaseModel):
        """Request model for configure multiple operations."""
        
        op: Literal["set", "delete"]
        path: Union[List[str], List[List[str]]]
        
        class Config:
            extra = "allow"

