"""Traffic Engineering router.

Endpoints:
  GET  /vyos/traffic-engineering/capabilities
  GET  /vyos/traffic-engineering/config
  POST /vyos/traffic-engineering/batch

``protocols traffic-engineering`` exists on VyOS 1.5 and not on 1.4. The
mapper rejects every path on 1.4, and the config route returns the empty
shape there without reading the device.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.traffic_engineering import TrafficEngineeringBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.traffic_engineering import TrafficEngineeringMapper
from vyos_mappers.traffic_engineering.traffic_engineering import TRAFFIC_ENGINEERING_NODE
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_comma_batch_op

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
    configured: bool = False
    admin_groups: List[AdminGroup] = []
    interfaces: List[TeInterface] = []


class TrafficEngineeringBatchOperation(BaseModel):
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


class TrafficEngineeringBatchRequest(BaseModel):
    operations: List[TrafficEngineeringBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_te_capabilities(request: Request):
    """Traffic Engineering feature flags, read from the mapper allowlist."""
    await require_read_permission(request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(request)
        builder = TrafficEngineeringBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_te_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=TrafficEngineeringConfig)
async def get_te_config(http_request: Request, refresh: bool = False):
    """Return the Traffic Engineering configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(http_request)
        mapper = cast(
            TrafficEngineeringMapper,
            CommandMapperRegistry.get_mapper("traffic_engineering", service.get_version()),
        )
        if TRAFFIC_ENGINEERING_NODE not in mapper.versioned_nodes():
            return TrafficEngineeringConfig()

        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return TrafficEngineeringConfig(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in get_te_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def te_batch_configure(http_request: Request, body: TrafficEngineeringBatchRequest):
    """Execute a batch of Traffic Engineering configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.TRAFFIC_ENGINEERING)

    try:
        service = get_session_vyos_service(http_request)
        builder = TrafficEngineeringBatchBuilder(version=service.get_version())
        try:
            for operation in body.operations:
                call_comma_batch_op(builder, operation.op, operation.value)
        except ValueError as exc:
            # The mapper raises ValueError on 1.4 and for a value the device rejects.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Traffic Engineering configuration updated"}
            if response.status == 200
            else None,
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in te_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
