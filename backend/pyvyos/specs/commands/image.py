"""Pydantic models for image operations."""

from typing import List, Literal, Optional

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class ImageAddRequest(ApiRequest):
        """Request model for image add operation."""
        
        op: Literal["add"] = "add"
        path: Optional[List[str]] = None
        url: Optional[str] = None
        file: Optional[str] = None
        name: Optional[str] = None


    class ImageDeleteRequest(ApiRequest):
        """Request model for image delete operation."""
        
        op: Literal["delete"] = "delete"
        path: Optional[List[str]] = None
        url: Optional[str] = None
        file: Optional[str] = None
        name: Optional[str] = None

