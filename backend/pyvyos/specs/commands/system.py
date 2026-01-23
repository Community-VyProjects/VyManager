"""Pydantic models for system operations (reboot, poweroff)."""

from typing import List, Literal

try:
    from pydantic import BaseModel
    from ..models import ApiRequest
except ImportError:
    BaseModel = None  # type: ignore
    ApiRequest = None  # type: ignore


if BaseModel:

    class RebootRequest(ApiRequest):
        """Request model for reboot operation."""
        
        op: Literal["reboot"] = "reboot"
        path: List[str] = ["now"]


    class PoweroffRequest(ApiRequest):
        """Request model for poweroff operation."""
        
        op: Literal["poweroff"] = "poweroff"
        path: List[str] = ["now"]

