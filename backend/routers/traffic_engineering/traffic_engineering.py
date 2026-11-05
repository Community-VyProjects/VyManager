"""Traffic Engineering Protocol Router.

API endpoints for managing VyOS Traffic Engineering configuration.
Traffic Engineering is only supported on VyOS 1.5+; on 1.4 the capabilities
endpoint advertises the feature as unsupported and the config/batch endpoints
return early with empty data.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.base import CommandMapperRegistry
from vyos_builders.traffic_engineering import TrafficEngineeringBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/traffic-engineering", tags=["traffic-engineering"])


# ============================================================================
# Pydantic Models
# ============================================================================


class AdminGroup(BaseModel):
    name: str
    bit_position: Optional[int] = None


class TeInterface(BaseModel):
    name: str
    admin_groups: List[str] = []
    max_bandwidth: Optional[int] = None
    max_reservable_bandwidth: Optional[int] = None
    metric: Optional[int] = None


class TrafficEngineeringConfig(BaseModel):
    admin_groups: List[AdminGroup] = []
    interfaces: List[TeInterface] = []


class TrafficEngineeringBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class TrafficEngineeringBatchRequest(BaseModel):
    operations: List[TrafficEngineeringBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_te_capabilities(request: Request):
    """Return Traffic Engineering feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(request)
        builder = TrafficEngineeringBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_te_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=TrafficEngineeringConfig)
async def get_te_config(http_request: Request, refresh: bool = False):
    """Return the full Traffic Engineering configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = TrafficEngineeringBatchBuilder(version=version)
        if not builder.get_capabilities()["features"]["traffic_engineering"]["supported"]:
            return TrafficEngineeringConfig()

        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = CommandMapperRegistry.get_mapper("traffic_engineering", version)
        return TrafficEngineeringConfig(**mapper.parse_config(full_config))
    except Exception:
        logger.exception("Unhandled error in get_te_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def te_batch_configure(http_request: Request, body: TrafficEngineeringBatchRequest):
    """Execute a batch of Traffic Engineering configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(http_request)

        if "1.4" in service.get_version():
            raise HTTPException(
                status_code=400,
                detail="Traffic Engineering is not supported on VyOS 1.4",
            )

        builder = TrafficEngineeringBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = resolve_batch_method(builder, operation.op)
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
            data={"message": "Traffic Engineering configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in te_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
