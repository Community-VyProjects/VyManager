"""RIPng Protocol Router.

API endpoints for managing VyOS RIPng (Routing Information Protocol next generation)
configuration. Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import RipNgBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ripng", tags=["ripng"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RipNgDistributeListGlobal(BaseModel):
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipNgDistributeListInterface(BaseModel):
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipNgDistributeList(BaseModel):
    global_filters: RipNgDistributeListGlobal = RipNgDistributeListGlobal()
    interface_filters: List[RipNgDistributeListInterface] = []


class RipNgInterface(BaseModel):
    name: str
    split_horizon: Optional[str] = None


class RipNgRedistribute(BaseModel):
    protocol: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class RipNgTimers(BaseModel):
    update: Optional[int] = None
    timeout: Optional[int] = None
    garbage_collection: Optional[int] = None


class RipNgConfig(BaseModel):
    default_information_originate: bool = False
    default_metric: Optional[int] = None
    route_map: Optional[str] = None
    aggregate_addresses: List[str] = []
    networks: List[str] = []
    routes: List[str] = []
    passive_interfaces: List[str] = []
    distribute_list: RipNgDistributeList = RipNgDistributeList()
    interfaces: List[RipNgInterface] = []
    redistribute: List[RipNgRedistribute] = []
    timers: RipNgTimers = RipNgTimers()


class RipNgBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class RipNgBatchRequest(BaseModel):
    operations: List[RipNgBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_ripng_capabilities(request: Request):
    """Return RIPng feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(request)
        builder = RipNgBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_ripng_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RipNgConfig)
async def get_ripng_config(http_request: Request, refresh: bool = False):
    """Return the full RIPng configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ripng_raw = full_config.get("protocols", {}).get("ripng", {})

        if not ripng_raw:
            return RipNgConfig()

        return RipNgConfig(
            default_information_originate="originate" in (ripng_raw.get("default-information") or {}),
            default_metric=_safe_int(ripng_raw.get("default-metric")),
            route_map=ripng_raw.get("route-map"),
            aggregate_addresses=_to_list(ripng_raw.get("aggregate-address")),
            networks=_to_list(ripng_raw.get("network")),
            routes=_to_list(ripng_raw.get("route")),
            passive_interfaces=_to_list(ripng_raw.get("passive-interface")),
            distribute_list=_parse_distribute_list(ripng_raw.get("distribute-list", {})),
            interfaces=_parse_interfaces(ripng_raw.get("interface", {})),
            redistribute=_parse_redistribute(ripng_raw.get("redistribute", {})),
            timers=_parse_timers(ripng_raw.get("timers", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_ripng_config")
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


def _to_list(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return list(value.keys())
    return []


def _parse_distribute_list(raw: dict) -> RipNgDistributeList:
    if not raw:
        return RipNgDistributeList()

    acl_raw = raw.get("access-list", {}) or {}
    pl_raw = raw.get("prefix-list", {}) or {}

    global_filters = RipNgDistributeListGlobal(
        access_list_in=acl_raw.get("in") if isinstance(acl_raw, dict) else None,
        access_list_out=acl_raw.get("out") if isinstance(acl_raw, dict) else None,
        prefix_list_in=pl_raw.get("in") if isinstance(pl_raw, dict) else None,
        prefix_list_out=pl_raw.get("out") if isinstance(pl_raw, dict) else None,
    )

    iface_filters: List[RipNgDistributeListInterface] = []
    for iface, iface_raw in (raw.get("interface", {}) or {}).items():
        if iface_raw is None:
            iface_raw = {}
        iface_acl = iface_raw.get("access-list", {}) or {}
        iface_pl = iface_raw.get("prefix-list", {}) or {}
        iface_filters.append(RipNgDistributeListInterface(
            interface=iface,
            access_list_in=iface_acl.get("in") if isinstance(iface_acl, dict) else None,
            access_list_out=iface_acl.get("out") if isinstance(iface_acl, dict) else None,
            prefix_list_in=iface_pl.get("in") if isinstance(iface_pl, dict) else None,
            prefix_list_out=iface_pl.get("out") if isinstance(iface_pl, dict) else None,
        ))

    return RipNgDistributeList(global_filters=global_filters, interface_filters=iface_filters)


def _parse_interfaces(raw: dict) -> List[RipNgInterface]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        split_horizon_raw = cfg.get("split-horizon", {}) or {}
        split_horizon = None
        if "poison-reverse" in split_horizon_raw:
            split_horizon = "poison-reverse"
        elif "disable" in split_horizon_raw:
            split_horizon = "disable"

        interfaces.append(RipNgInterface(
            name=iface_name,
            split_horizon=split_horizon,
        ))

    return interfaces


def _parse_redistribute(raw: dict) -> List[RipNgRedistribute]:
    if not raw:
        return []

    entries = []
    for protocol, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(RipNgRedistribute(
            protocol=protocol,
            metric=_safe_int(cfg.get("metric")),
            route_map=cfg.get("route-map"),
        ))
    return entries


def _parse_timers(raw: dict) -> RipNgTimers:
    if not raw:
        return RipNgTimers()
    return RipNgTimers(
        update=_safe_int(raw.get("update")),
        timeout=_safe_int(raw.get("timeout")),
        garbage_collection=_safe_int(raw.get("garbage-collection")),
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def ripng_batch_configure(http_request: Request, body: RipNgBatchRequest):
    """Execute a batch of RIPng configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.RIPNG)

    try:
        service = get_session_vyos_service(http_request)
        builder = RipNgBatchBuilder(version=service.get_version())

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
            elif len(params) == 3 and operation.value is not None:
                values = operation.value.split(",", 2)
                if len(values) == 3:
                    method(values[0], values[1], values[2])
                elif len(values) == 2:
                    method(values[0], values[1], "")

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "RIPng configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in ripng_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
