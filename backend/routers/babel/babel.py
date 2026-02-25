"""
Babel Protocol Router

API endpoints for managing VyOS Babel routing protocol configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import BabelBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect

router = APIRouter(prefix="/vyos/babel", tags=["babel"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ============================================================================
# Pydantic Models
# ============================================================================


class BabelInterface(BaseModel):
    """Babel interface configuration."""
    name: str
    type: Optional[str] = None  # auto, wired, wireless
    channel: Optional[str] = None  # 1-254, interfering, non-interfering
    hello_interval: Optional[int] = None  # 20-655340 ms
    update_interval: Optional[int] = None  # 20-655340 ms
    rxcost: Optional[int] = None  # 1-65534
    split_horizon: Optional[str] = None  # default, enable, disable
    enable_timestamps: bool = False
    max_rtt_penalty: Optional[int] = None  # 0-65535 ms
    rtt_decay: Optional[int] = None  # 1-256
    rtt_min: Optional[int] = None  # 1-65535 ms
    rtt_max: Optional[int] = None  # 1-65535 ms


class BabelParameters(BaseModel):
    """Babel global parameters."""
    diversity: bool = False
    diversity_factor: Optional[int] = None  # 1-256
    resend_delay: Optional[int] = None  # 20-655340 ms
    smoothing_half_life: Optional[int] = None  # 0-65534 seconds


class BabelRedistribute(BaseModel):
    """Babel redistribution settings."""
    ipv4: List[str] = []  # List of protocols
    ipv6: List[str] = []  # List of protocols


class DistributeListFilter(BaseModel):
    """A single direction filter (access-list or prefix-list)."""
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class DistributeListInterfaceFilter(BaseModel):
    """Per-interface distribute list filter."""
    interface: str
    access_list_in: Optional[str] = None
    access_list_out: Optional[str] = None
    prefix_list_in: Optional[str] = None
    prefix_list_out: Optional[str] = None


class BabelDistributeList(BaseModel):
    """Babel distribute list configuration."""
    ipv4: DistributeListFilter = DistributeListFilter()
    ipv6: DistributeListFilter = DistributeListFilter()
    ipv4_interfaces: List[DistributeListInterfaceFilter] = []
    ipv6_interfaces: List[DistributeListInterfaceFilter] = []


class BabelConfig(BaseModel):
    """Complete Babel configuration."""
    interfaces: List[BabelInterface] = []
    parameters: BabelParameters = BabelParameters()
    redistribute: BabelRedistribute = BabelRedistribute()
    distribute_list: BabelDistributeList = BabelDistributeList()


class BabelBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class BabelBatchRequest(BaseModel):
    """Model for batch configuration."""
    operations: List[BabelBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_babel_capabilities(request: Request):
    """Get Babel feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BabelBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=BabelConfig)
async def get_babel_config(http_request: Request, refresh: bool = False):
    """Get all Babel configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        babel_config = full_config.get("protocols", {}).get("babel", {})

        if not babel_config:
            return BabelConfig()

        # Parse interfaces
        interfaces = parse_interfaces(babel_config.get("interface", {}))

        # Parse parameters
        parameters = parse_parameters(babel_config.get("parameters", {}))

        # Parse redistribute
        redistribute = parse_redistribute(babel_config.get("redistribute", {}))

        # Parse distribute-list
        distribute_list = parse_distribute_list(babel_config.get("distribute-list", {}))

        return BabelConfig(
            interfaces=interfaces,
            parameters=parameters,
            redistribute=redistribute,
            distribute_list=distribute_list
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Config Parsers
# ============================================================================


def parse_interfaces(interfaces_raw: dict) -> List[BabelInterface]:
    """Parse Babel interface configuration."""
    interfaces = []

    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        interfaces.append(BabelInterface(
            name=iface_name,
            type=iface_config.get("type"),
            channel=iface_config.get("channel"),
            hello_interval=int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
            update_interval=int(iface_config["update-interval"]) if iface_config.get("update-interval") else None,
            rxcost=int(iface_config["rxcost"]) if iface_config.get("rxcost") else None,
            split_horizon=iface_config.get("split-horizon"),
            enable_timestamps="enable-timestamps" in iface_config,
            max_rtt_penalty=int(iface_config["max-rtt-penalty"]) if iface_config.get("max-rtt-penalty") else None,
            rtt_decay=int(iface_config["rtt-decay"]) if iface_config.get("rtt-decay") else None,
            rtt_min=int(iface_config["rtt-min"]) if iface_config.get("rtt-min") else None,
            rtt_max=int(iface_config["rtt-max"]) if iface_config.get("rtt-max") else None,
        ))

    return interfaces


def parse_parameters(params_raw: dict) -> BabelParameters:
    """Parse Babel global parameters."""
    if not params_raw:
        return BabelParameters()

    return BabelParameters(
        diversity="diversity" in params_raw,
        diversity_factor=int(params_raw["diversity-factor"]) if params_raw.get("diversity-factor") else None,
        resend_delay=int(params_raw["resend-delay"]) if params_raw.get("resend-delay") else None,
        smoothing_half_life=int(params_raw["smoothing-half-life"]) if params_raw.get("smoothing-half-life") else None,
    )


def parse_redistribute(redistribute_raw: dict) -> BabelRedistribute:
    """Parse Babel redistribution settings."""
    if not redistribute_raw:
        return BabelRedistribute()

    ipv4_protocols = list(redistribute_raw.get("ipv4", {}).keys())
    ipv6_protocols = list(redistribute_raw.get("ipv6", {}).keys())

    return BabelRedistribute(
        ipv4=ipv4_protocols,
        ipv6=ipv6_protocols
    )


def parse_distribute_list(dist_list_raw: dict) -> BabelDistributeList:
    """Parse Babel distribute list configuration."""
    if not dist_list_raw:
        return BabelDistributeList()

    ipv4_raw = dist_list_raw.get("ipv4", {})
    ipv6_raw = dist_list_raw.get("ipv6", {})

    # Parse global filters
    ipv4_filter = _parse_global_filter(ipv4_raw)
    ipv6_filter = _parse_global_filter(ipv6_raw)

    # Parse per-interface filters
    ipv4_iface_filters = _parse_interface_filters(ipv4_raw.get("interface", {}))
    ipv6_iface_filters = _parse_interface_filters(ipv6_raw.get("interface", {}))

    return BabelDistributeList(
        ipv4=ipv4_filter,
        ipv6=ipv6_filter,
        ipv4_interfaces=ipv4_iface_filters,
        ipv6_interfaces=ipv6_iface_filters
    )


def _parse_global_filter(af_raw: dict) -> DistributeListFilter:
    """Parse global (non-interface) distribute-list filter."""
    if not af_raw:
        return DistributeListFilter()

    acl_raw = af_raw.get("access-list", {})
    pfx_raw = af_raw.get("prefix-list", {})

    return DistributeListFilter(
        access_list_in=acl_raw.get("in") if isinstance(acl_raw, dict) else None,
        access_list_out=acl_raw.get("out") if isinstance(acl_raw, dict) else None,
        prefix_list_in=pfx_raw.get("in") if isinstance(pfx_raw, dict) else None,
        prefix_list_out=pfx_raw.get("out") if isinstance(pfx_raw, dict) else None,
    )


def _parse_interface_filters(iface_raw: dict) -> List[DistributeListInterfaceFilter]:
    """Parse per-interface distribute-list filters."""
    filters = []

    if not iface_raw:
        return filters

    for iface_name, iface_config in iface_raw.items():
        if iface_config is None:
            iface_config = {}

        acl_raw = iface_config.get("access-list", {})
        pfx_raw = iface_config.get("prefix-list", {})

        if not acl_raw:
            acl_raw = {}
        if not pfx_raw:
            pfx_raw = {}

        filters.append(DistributeListInterfaceFilter(
            interface=iface_name,
            access_list_in=acl_raw.get("in") if isinstance(acl_raw, dict) else None,
            access_list_out=acl_raw.get("out") if isinstance(acl_raw, dict) else None,
            prefix_list_in=pfx_raw.get("in") if isinstance(pfx_raw, dict) else None,
            prefix_list_out=pfx_raw.get("out") if isinstance(pfx_raw, dict) else None,
        ))

    return filters


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def babel_batch_configure(http_request: Request, body: BabelBatchRequest):
    """Execute a batch of Babel configuration operations."""
    await require_write_permission(http_request, FeatureGroup.BABEL)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = BabelBatchBuilder(version=version)

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {operation.op}")
            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {operation.op}")
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1 and operation.value:
                method(operation.value)
            elif len(params) == 2 and operation.value:
                values = operation.value.split(",", 1)
                if len(values) == 2:
                    method(values[0], values[1])
                else:
                    method(operation.value)
            elif len(params) == 0:
                method()

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Babel configuration updated"},
            error=response.error if response.error else None
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
