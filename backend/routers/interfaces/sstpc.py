"""
SSTP Client Interface Configuration Endpoints

All SSTPC interface endpoints for VyOS configuration.
SSTPC tunnels PPP over HTTPS to a remote server, enabling VPN connectivity
through firewalls that permit only HTTPS (port 443) traffic.
"""

import inspect
import logging
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from starlette.concurrency import run_in_threadpool

from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/sstpc", tags=["sstpc-interface"])


# ============================================================================
# Request / Response Models
# ============================================================================


class BatchOperation(BaseModel):
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value (if required)")


class BatchRequest(BaseModel):
    interface: str = Field(..., description="Interface name (e.g., sstpc0)")
    operations: List[BatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class SstpcAuthentication(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class SstpcSslConfig(BaseModel):
    ca_certificate: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class SstpcInterfaceConfig(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    disabled: bool = False
    server: Optional[str] = None
    port: Optional[str] = None
    default_route_distance: Optional[str] = None
    no_default_route: bool = False
    no_peer_dns: bool = False
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    authentication: Optional[SstpcAuthentication] = None
    ssl: Optional[SstpcSslConfig] = None

    model_config = ConfigDict(populate_by_name=True)


class SstpcInterfacesConfigResponse(BaseModel):
    interfaces: List[SstpcInterfaceConfig] = Field(default_factory=list)
    total: int = 0


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware feature capabilities for SSTPC interfaces."""
    await require_read_permission(request, FeatureGroup.SSTPC)
    service = get_session_vyos_service(request)
    from vyos_builders.interfaces.sstpc import SstpcInterfaceBuilderMixin
    builder = SstpcInterfaceBuilderMixin(version=service.get_version())
    return builder.get_capabilities()


@router.get("/config", response_model=SstpcInterfacesConfigResponse)
async def get_config(http_request: Request, refresh: bool = False) -> SstpcInterfacesConfigResponse:
    """Get all SSTPC interface configurations from VyOS."""
    await require_read_permission(http_request, FeatureGroup.SSTPC)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh)
        raw_config = full_config.get("interfaces", {}).get("sstpc", {})

        from vyos_mappers.interfaces.sstpc_versions import get_sstpc_mapper
        mapper = get_sstpc_mapper(service.get_version())
        parsed = mapper.parse_interfaces_of_type(raw_config)
        return SstpcInterfacesConfigResponse(**parsed)
    except Exception:
        logger.exception("Unhandled error in get_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: BatchRequest) -> VyOSResponse:
    """Configure an SSTPC interface using batch operations."""
    await require_write_permission(http_request, FeatureGroup.SSTPC)

    try:
        service = get_session_vyos_service(http_request)
        from vyos_builders.interfaces.sstpc import SstpcInterfaceBuilderMixin
        batch = SstpcInterfaceBuilderMixin(version=service.get_version())

        for op in request.operations:
            if op.op in batch._INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' is not a valid interface operation",
                )

            method = getattr(batch, op.op, None)
            if method is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 1:
                method(request.interface)
            elif len(params) == 2:
                if op.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op.op}' requires a value",
                    )
                method(request.interface, op.value)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation '{op.op}' has unexpected signature",
                )

        response = service.execute_batch(batch)
        return VyOSResponse(
            success=response.status == 200,
            data=response.result if isinstance(response.result, dict) else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
