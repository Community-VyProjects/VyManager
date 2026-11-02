"""SLA Service Router.

API endpoints for managing VyOS SLA (Service Level Agreement) configuration.
Covers OWAMP (One-Way Active Measurement Protocol) and TWAMP (Two-Way Active
Measurement Protocol) server settings.

Version differences:
  1.4 and 1.5 — identical SLA configuration paths; no version-specific behavior.

Endpoints:
  GET  /vyos/sla/capabilities  — version-aware feature flags
  GET  /vyos/sla/config        — normalized SLA configuration
  POST /vyos/sla/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers import CommandMapperRegistry
from vyos_builders.sla import SLABatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/sla", tags=["sla"])


# ============================================================================
# Pydantic Models
# ============================================================================


class OWAMPServerConfig(BaseModel):
    """OWAMP server configuration."""
    enabled: bool = False
    port: Optional[int] = None


class TWAMPServerConfig(BaseModel):
    """TWAMP server configuration."""
    enabled: bool = False
    port: Optional[int] = None


class SLAConfig(BaseModel):
    """Full SLA service configuration."""
    owamp_server: OWAMPServerConfig = OWAMPServerConfig()
    twamp_server: TWAMPServerConfig = TWAMPServerConfig()


class SLABatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Multi-arg methods: comma-separated."
        ),
    )


class SLABatchRequest(BaseModel):
    operations: List[SLABatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_sla_capabilities(request: Request):
    """Return SLA feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.SLA)
    try:
        service = get_session_vyos_service(request)
        builder = SLABatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_sla_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=SLAConfig)
async def get_sla_config(http_request: Request, refresh: bool = False):
    """Return the full SLA configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.SLA)
    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("sla", version)
        return SLAConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_sla_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def sla_batch_configure(http_request: Request, body: SLABatchRequest):
    """Execute a batch of SLA configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.SLA)
    try:
        service = get_session_vyos_service(http_request)
        builder = SLABatchBuilder(version=service.get_version())

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
            data={"message": "SLA configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in sla_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
