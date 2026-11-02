"""Salt Minion Service Router.

API endpoints for managing VyOS Salt Minion configuration.

Version differences:
  1.4 and 1.5 — identical Salt Minion configuration paths; no version-specific behavior.

Endpoints:
  GET  /vyos/salt-minion/capabilities  — version-aware feature flags
  GET  /vyos/salt-minion/config        — normalized Salt Minion configuration
  POST /vyos/salt-minion/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers import CommandMapperRegistry
from vyos_builders.salt_minion import SaltMinionBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/salt-minion", tags=["salt-minion"])


# ============================================================================
# Pydantic Models
# ============================================================================


class SaltMinionConfig(BaseModel):
    """Full Salt Minion service configuration."""
    hash: Optional[str] = None
    id: Optional[str] = None
    interval: Optional[int] = None
    master_key: Optional[str] = None
    masters: List[str] = []
    source_interface: Optional[str] = None


class SaltMinionBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class SaltMinionBatchRequest(BaseModel):
    operations: List[SaltMinionBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_salt_minion_capabilities(request: Request):
    """Return Salt Minion feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.SALT_MINION)
    try:
        service = get_session_vyos_service(request)
        builder = SaltMinionBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_salt_minion_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=SaltMinionConfig)
async def get_salt_minion_config(http_request: Request, refresh: bool = False):
    """Return the full Salt Minion configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SALT_MINION)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("salt_minion", version)
        return SaltMinionConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_salt_minion_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def salt_minion_batch_configure(http_request: Request, body: SaltMinionBatchRequest):
    """Execute a batch of Salt Minion configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SALT_MINION)
    try:
        service = get_session_vyos_service(http_request)
        builder = SaltMinionBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) >= 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Salt Minion configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in salt_minion_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
