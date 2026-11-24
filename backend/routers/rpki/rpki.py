"""RPKI Protocol Router.

API endpoints for managing VyOS RPKI (Resource Public Key Infrastructure)
configuration. Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.rpki import RpkiBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/rpki", tags=["rpki"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RpkiSshConfig(BaseModel):
    key: Optional[str] = None
    username: Optional[str] = None


class RpkiCacheServer(BaseModel):
    address: str
    port: Optional[int] = None
    preference: Optional[int] = None
    source_address: Optional[str] = None
    ssh: Optional[RpkiSshConfig] = None


class RpkiConfig(BaseModel):
    cache_servers: List[RpkiCacheServer] = []
    expire_interval: Optional[int] = None
    polling_period: Optional[int] = None
    retry_interval: Optional[int] = None


class RpkiBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Zero-arg methods: omit (a value is rejected). "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated; the last argument keeps any commas."
        ),
    )


class RpkiBatchRequest(BaseModel):
    operations: List[RpkiBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_rpki_capabilities(request: Request):
    """Return RPKI feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.RPKI)

    try:
        service = get_session_vyos_service(request)
        builder = RpkiBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_rpki_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RpkiConfig)
async def get_rpki_config(http_request: Request, refresh: bool = False):
    """Return the full RPKI configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.RPKI)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("rpki", version)
        return RpkiConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_rpki_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def rpki_batch_configure(http_request: Request, body: RpkiBatchRequest):
    """Execute a batch of RPKI configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.RPKI)

    try:
        service = get_session_vyos_service(http_request)
        builder = RpkiBatchBuilder(version=service.get_version())

        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as e:
            # The mapper rejects a cache leaf this device version does not have.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "RPKI configuration updated"} if response.status == 200 else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        # Includes the 409 execute_batch raises while a commit-confirm is pending.
        raise
    except Exception:
        logger.exception("Unhandled error in rpki_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
