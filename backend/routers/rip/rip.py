"""RIP Protocol Router.

API endpoints for managing VyOS RIP (Routing Information Protocol) configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import RipBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/rip", tags=["rip"])


# ============================================================================
# Pydantic Models
# ============================================================================


class RipDistributeListGlobal(BaseModel):
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipDistributeListInterface(BaseModel):
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class RipDistributeList(BaseModel):
    global_filters: RipDistributeListGlobal = RipDistributeListGlobal()
    interface_filters: List[RipDistributeListInterface] = []


class RipMd5Key(BaseModel):
    key_id: str
    password: str


class RipInterface(BaseModel):
    name: str
    authentication_type: Optional[str] = None
    md5_keys: List[RipMd5Key] = []
    plaintext_password: Optional[str] = None
    receive_version: Optional[str] = None
    send_version: Optional[str] = None
    split_horizon: Optional[str] = None


class RipNetworkDistance(BaseModel):
    prefix: str
    distance: Optional[int] = None
    access_list: Optional[str] = None


class RipRedistribute(BaseModel):
    protocol: str
    metric: Optional[int] = None
    route_map: Optional[str] = None


class RipTimers(BaseModel):
    update: Optional[int] = None
    timeout: Optional[int] = None
    garbage_collection: Optional[int] = None


class RipConfig(BaseModel):
    default_distance: Optional[int] = None
    default_information_originate: bool = False
    default_metric: Optional[int] = None
    route_map: Optional[str] = None
    version: Optional[str] = None
    networks: List[str] = []
    neighbors: List[str] = []
    routes: List[str] = []
    passive_interfaces: List[str] = []
    distribute_list: RipDistributeList = RipDistributeList()
    interfaces: List[RipInterface] = []
    network_distances: List[RipNetworkDistance] = []
    redistribute: List[RipRedistribute] = []
    timers: RipTimers = RipTimers()


class RipBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Comma-separated arguments")


class RipBatchRequest(BaseModel):
    operations: List[RipBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_rip_capabilities(request: Request):
    """Return RIP feature capabilities based on the device VyOS version."""
    await require_read_permission(request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(request)
        builder = RipBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except Exception:
        logger.exception("Unhandled error in get_rip_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=RipConfig)
async def get_rip_config(http_request: Request, refresh: bool = False):
    """Return the full RIP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        rip_raw = full_config.get("protocols", {}).get("rip", {})

        if not rip_raw:
            return RipConfig()

        return RipConfig(
            default_distance=_safe_int(rip_raw.get("default-distance")),
            default_information_originate="originate" in (rip_raw.get("default-information") or {}),
            default_metric=_safe_int(rip_raw.get("default-metric")),
            route_map=rip_raw.get("route-map"),
            version=rip_raw.get("version"),
            networks=_to_list(rip_raw.get("network")),
            neighbors=_to_list(rip_raw.get("neighbor")),
            routes=_to_list(rip_raw.get("route")),
            passive_interfaces=_to_list(rip_raw.get("passive-interface")),
            distribute_list=_parse_distribute_list(rip_raw.get("distribute-list", {})),
            interfaces=_parse_interfaces(rip_raw.get("interface", {})),
            network_distances=_parse_network_distances(rip_raw.get("network-distance", {})),
            redistribute=_parse_redistribute(rip_raw.get("redistribute", {})),
            timers=_parse_timers(rip_raw.get("timers", {})),
        )
    except Exception:
        logger.exception("Unhandled error in get_rip_config")
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


def _parse_distribute_list(raw: dict) -> RipDistributeList:
    if not raw:
        return RipDistributeList()

    acl_raw = raw.get("access-list", {}) or {}
    pl_raw = raw.get("prefix-list", {}) or {}

    global_filters = RipDistributeListGlobal(
        access_list_in=acl_raw.get("in") if isinstance(acl_raw, dict) else None,
        access_list_out=acl_raw.get("out") if isinstance(acl_raw, dict) else None,
        prefix_list_in=pl_raw.get("in") if isinstance(pl_raw, dict) else None,
        prefix_list_out=pl_raw.get("out") if isinstance(pl_raw, dict) else None,
    )

    iface_filters: List[RipDistributeListInterface] = []
    for iface, iface_raw in (raw.get("interface", {}) or {}).items():
        if iface_raw is None:
            iface_raw = {}
        iface_acl = iface_raw.get("access-list", {}) or {}
        iface_pl = iface_raw.get("prefix-list", {}) or {}
        iface_filters.append(RipDistributeListInterface(
            interface=iface,
            access_list_in=iface_acl.get("in") if isinstance(iface_acl, dict) else None,
            access_list_out=iface_acl.get("out") if isinstance(iface_acl, dict) else None,
            prefix_list_in=iface_pl.get("in") if isinstance(iface_pl, dict) else None,
            prefix_list_out=iface_pl.get("out") if isinstance(iface_pl, dict) else None,
        ))

    return RipDistributeList(global_filters=global_filters, interface_filters=iface_filters)


def _parse_interfaces(raw: dict) -> List[RipInterface]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        auth_raw = cfg.get("authentication", {}) or {}
        md5_raw = auth_raw.get("md5", {}) or {}
        plaintext = auth_raw.get("plaintext-password")

        md5_keys = []
        for key_id, key_cfg in md5_raw.items():
            if key_cfg is None:
                key_cfg = {}
            md5_keys.append(RipMd5Key(
                key_id=str(key_id),
                password=key_cfg.get("password", "") if isinstance(key_cfg, dict) else "",
            ))

        auth_type = None
        if md5_keys:
            auth_type = "md5"
        elif plaintext:
            auth_type = "plaintext"

        split_horizon_raw = cfg.get("split-horizon", {}) or {}
        split_horizon = None
        if "poison-reverse" in split_horizon_raw:
            split_horizon = "poison-reverse"
        elif "disable" in split_horizon_raw:
            split_horizon = "disable"

        interfaces.append(RipInterface(
            name=iface_name,
            authentication_type=auth_type,
            md5_keys=md5_keys,
            plaintext_password=plaintext,
            receive_version=(cfg.get("receive", {}) or {}).get("version"),
            send_version=(cfg.get("send", {}) or {}).get("version"),
            split_horizon=split_horizon,
        ))

    return interfaces


def _parse_network_distances(raw: dict) -> List[RipNetworkDistance]:
    if not raw:
        return []

    entries = []
    for prefix, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(RipNetworkDistance(
            prefix=prefix,
            distance=_safe_int(cfg.get("distance")),
            access_list=cfg.get("access-list"),
        ))
    return entries


def _parse_redistribute(raw: dict) -> List[RipRedistribute]:
    if not raw:
        return []

    entries = []
    for protocol, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(RipRedistribute(
            protocol=protocol,
            metric=_safe_int(cfg.get("metric")),
            route_map=cfg.get("route-map"),
        ))
    return entries


def _parse_timers(raw: dict) -> RipTimers:
    if not raw:
        return RipTimers()
    return RipTimers(
        update=_safe_int(raw.get("update")),
        timeout=_safe_int(raw.get("timeout")),
        garbage_collection=_safe_int(raw.get("garbage-collection")),
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def rip_batch_configure(http_request: Request, body: RipBatchRequest):
    """Execute a batch of RIP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.RIP)

    try:
        service = get_session_vyos_service(http_request)
        builder = RipBatchBuilder(version=service.get_version())

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
            data={"message": "RIP configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error in rip_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
