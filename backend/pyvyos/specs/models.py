"""Base Pydantic models for PyVyOS API requests and responses."""

from typing import Any, Dict, List, Optional, Union

if False:  # type checking only
    from pydantic import BaseModel
else:
    try:
        from pydantic import BaseModel, Field
    except ImportError:
        BaseModel = None  # type: ignore
        Field = None  # type: ignore


class ApiRequest(BaseModel):
    """Base request model for VyOS API operations."""
    
    op: str
    path: Optional[Union[List[str], List[List[str]], List[Dict[str, Any]]]] = None
    
    class Config:
        extra = "allow"  # Allow additional fields (file, url, name, etc.)


class ApiResponse(BaseModel):
    """Base response model for VyOS API responses."""
    
    success: bool
    data: Union[Dict[str, Any], List[Any], str, None]
    error: Optional[str] = None

