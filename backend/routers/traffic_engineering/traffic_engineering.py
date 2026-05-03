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
from vyos_builders import TrafficEngineeringBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

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

        if "1.4" in version:
            return TrafficEngineeringConfig()

        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        te_raw = full_config.get("protocols", {}).get("traffic-engineering", {})

        if not te_raw:
            return TrafficEngineeringConfig()

        return TrafficEngineeringConfig(
            admin_groups=_parse_admin_groups(te_raw.get("admin-group", {})),
            interfaces=_parse_interfaces(te_raw.get("interface", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_te_config")
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


def _parse_admin_groups(raw: dict) -> List[AdminGroup]:
    if not raw:
        return []

    groups = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        groups.append(AdminGroup(
            name=name,
            bit_position=_safe_int(cfg.get("bit-position")),
        ))
    return groups


def _parse_interfaces(raw: dict) -> List[TeInterface]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        # admin-group is multi-value: may be a list or a single string
        raw_groups = cfg.get("admin-group", [])
        if isinstance(raw_groups, str):
            admin_groups = [raw_groups]
        elif isinstance(raw_groups, list):
            admin_groups = raw_groups
        else:
            admin_groups = list(raw_groups) if raw_groups else []

        interfaces.append(TeInterface(
            name=iface_name,
            admin_groups=admin_groups,
            max_bandwidth=_safe_int(cfg.get("max-bandwidth")),
            max_reservable_bandwidth=_safe_int(cfg.get("max-reservable-bandwidth")),
            metric=_safe_int(cfg.get("metric")),
        ))
    return interfaces


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
