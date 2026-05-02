"""RPKI Protocol Router.

API endpoints for managing VyOS RPKI (Resource Public Key Infrastructure)
configuration. Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import RpkiBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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
    value: Optional[str] = Field(None, description="Comma-separated arguments")


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
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        rpki_raw = full_config.get("protocols", {}).get("rpki", {})

        if not rpki_raw:
            return RpkiConfig()

        return RpkiConfig(
            cache_servers=_parse_cache_servers(rpki_raw.get("cache", {})),
            expire_interval=_safe_int(rpki_raw.get("expire-interval")),
            polling_period=_safe_int(rpki_raw.get("polling-period")),
            retry_interval=_safe_int(rpki_raw.get("retry-interval")),
        )
    except Exception:
        logger.exception("Unhandled error in get_rpki_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _safe_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_cache_servers(raw: dict) -> List[RpkiCacheServer]:
    if not raw:
        return []

    servers = []
    for address, cfg in raw.items():
        if cfg is None:
            cfg = {}

        ssh_raw = cfg.get("ssh", {}) or {}
        ssh = None
        if ssh_raw:
            ssh = RpkiSshConfig(
                key=ssh_raw.get("key"),
                username=ssh_raw.get("username"),
            )

        servers.append(RpkiCacheServer(
            address=address,
            port=_safe_int(cfg.get("port")),
            preference=_safe_int(cfg.get("preference")),
            source_address=cfg.get("source-address"),
            ssh=ssh,
        ))

    return servers


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

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
            elif len(params) == 2 and operation.value is not None:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value, "")

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "RPKI configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in rpki_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
