"""
PIM Router

API endpoints for managing VyOS PIM (Protocol Independent Multicast) configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols pim/
    ecmp
    ecmp rebalance
    igmp/
      watermark-warning  (1-65535)
    interface/<IFACE>/
      bfd
      bfd profile        (txt)
      dr-priority        (1-4294967295)
      hello              (1-180)
      igmp/
        disable
        join/<GROUP>/
          source-address (multi, ipv4)
        query-interval           (1-1800)
        query-max-response-time  (10-250)
        version                  (2|3)
      no-bsm
      no-unicast-bsm
      passive
      source-address     (ipv4)
    join-prune-interval  (1-65535)
    keep-alive-timer     (1-65535)
    no-v6-secondary
    packets              (1-255)
    register-accept-list/
      prefix-list        (txt)
    register-suppress-time (1-65535)
    rp/
      address/<IP>/
        group            (multi, ipv4net)
      keep-alive-timer   (1-65535)
    spt-switchover/
      infinity-and-beyond
      infinity-and-beyond prefix-list (txt)
    ssm/
      prefix-list        (txt)
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.pim import PimBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/pim", tags=["pim"])


# ============================================================================
# Pydantic Models
# ============================================================================


class PimIgmpJoin(BaseModel):
    """IGMP join group on an interface."""
    group: str
    source_addresses: List[str] = []


class PimInterfaceIgmp(BaseModel):
    """IGMP settings for a PIM interface."""
    disabled: bool = False
    joins: List[PimIgmpJoin] = []
    query_interval: Optional[int] = None
    query_max_response_time: Optional[int] = None
    version: Optional[int] = None


class PimInterface(BaseModel):
    """PIM interface configuration."""
    name: str
    bfd: bool = False
    bfd_profile: Optional[str] = None
    dr_priority: Optional[int] = None
    hello: Optional[int] = None
    no_bsm: bool = False
    no_unicast_bsm: bool = False
    passive: bool = False
    source_address: Optional[str] = None
    igmp: Optional[PimInterfaceIgmp] = None


class PimRpAddress(BaseModel):
    """Rendezvous Point address configuration."""
    address: str
    groups: List[str] = []


class PimRp(BaseModel):
    """RP configuration."""
    addresses: List[PimRpAddress] = []
    keep_alive_timer: Optional[int] = None


class PimSptSwitchover(BaseModel):
    """SPT switchover configuration."""
    infinity_and_beyond: bool = False
    prefix_list: Optional[str] = None


class PimConfig(BaseModel):
    """Complete PIM configuration."""
    ecmp: bool = False
    ecmp_rebalance: bool = False
    igmp_watermark_warning: Optional[int] = None
    interfaces: List[PimInterface] = []
    join_prune_interval: Optional[int] = None
    keep_alive_timer: Optional[int] = None
    no_v6_secondary: bool = False
    packets: Optional[int] = None
    register_accept_list_prefix_list: Optional[str] = None
    register_suppress_time: Optional[int] = None
    rp: Optional[PimRp] = None
    spt_switchover: Optional[PimSptSwitchover] = None
    ssm_prefix_list: Optional[str] = None


class PimBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PimBatchGroup(BaseModel):
    """A group of operations scoped to a single interface (or global)."""
    interface: Optional[str] = Field(None, description="Interface name (null for global ops)")
    operations: List[PimBatchOperation]


class PimBatchRequest(BaseModel):
    """Model for batch configuration. Supports multiple groups in a single atomic commit."""
    groups: List[PimBatchGroup]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_pim_capabilities(request: Request):
    """Get PIM feature capabilities based on device VyOS version."""
    await require_read_permission(request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = PimBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=PimConfig)
async def get_pim_config(http_request: Request, refresh: bool = False):
    """Get all PIM configuration from VyOS in a generalized format."""
    await require_read_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        pim_config = full_config.get("protocols", {}).get("pim", {})

        if not pim_config:
            return PimConfig()

        return PimConfig(
            ecmp="ecmp" in pim_config and (
                pim_config["ecmp"] is None
                or isinstance(pim_config.get("ecmp"), dict)
                or pim_config.get("ecmp") == {}
            ),
            ecmp_rebalance=_has_nested(pim_config, "ecmp", "rebalance"),
            igmp_watermark_warning=_safe_int(_deep_get(pim_config, "igmp", "watermark-warning")),
            interfaces=_parse_interfaces(pim_config.get("interface", {})),
            join_prune_interval=_safe_int(pim_config.get("join-prune-interval")),
            keep_alive_timer=_safe_int(pim_config.get("keep-alive-timer")),
            no_v6_secondary="no-v6-secondary" in pim_config,
            packets=_safe_int(pim_config.get("packets")),
            register_accept_list_prefix_list=_deep_get(pim_config, "register-accept-list", "prefix-list"),
            register_suppress_time=_safe_int(pim_config.get("register-suppress-time")),
            rp=_parse_rp(pim_config.get("rp")),
            spt_switchover=_parse_spt_switchover(pim_config.get("spt-switchover")),
            ssm_prefix_list=_deep_get(pim_config, "ssm", "prefix-list"),
        )
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _deep_get(data: dict, *keys: str):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
        if data is None:
            return None
    return data


def _safe_int(value) -> Optional[int]:
    """Convert value to int safely."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _ensure_list(value) -> List[str]:
    """Convert VyOS config value to a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def _has_nested(data: dict, *keys: str) -> bool:
    """Check if nested key path exists (for flag-style nodes like ecmp.rebalance)."""
    for key in keys:
        if not isinstance(data, dict):
            return False
        val = data.get(key)
        if val is None and key not in data:
            return False
        data = val if val is not None else {}
    return True


def _parse_interfaces(interfaces_raw: dict) -> List[PimInterface]:
    """Parse PIM interface configurations."""
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        igmp_config = iface_config.get("igmp")
        igmp = None
        if igmp_config is not None:
            if not isinstance(igmp_config, dict):
                igmp_config = {}
            igmp = PimInterfaceIgmp(
                disabled="disable" in igmp_config,
                joins=_parse_igmp_joins(igmp_config.get("join", {})),
                query_interval=_safe_int(igmp_config.get("query-interval")),
                query_max_response_time=_safe_int(igmp_config.get("query-max-response-time")),
                version=_safe_int(igmp_config.get("version")),
            )

        bfd_config = iface_config.get("bfd")
        has_bfd = bfd_config is not None
        bfd_profile = None
        if isinstance(bfd_config, dict):
            bfd_profile = bfd_config.get("profile")

        interfaces.append(PimInterface(
            name=iface_name,
            bfd=has_bfd,
            bfd_profile=bfd_profile,
            dr_priority=_safe_int(iface_config.get("dr-priority")),
            hello=_safe_int(iface_config.get("hello")),
            no_bsm="no-bsm" in iface_config,
            no_unicast_bsm="no-unicast-bsm" in iface_config,
            passive="passive" in iface_config,
            source_address=iface_config.get("source-address"),
            igmp=igmp,
        ))

    return interfaces


def _parse_igmp_joins(joins_raw: dict) -> List[PimIgmpJoin]:
    """Parse IGMP join group configurations."""
    if not joins_raw or not isinstance(joins_raw, dict):
        return []

    joins = []
    for group_addr, join_config in joins_raw.items():
        if join_config is None:
            join_config = {}
        joins.append(PimIgmpJoin(
            group=group_addr,
            source_addresses=_ensure_list(join_config.get("source-address") if isinstance(join_config, dict) else None),
        ))
    return joins


def _parse_rp(rp_raw) -> Optional[PimRp]:
    """Parse RP configuration."""
    if not rp_raw or not isinstance(rp_raw, dict):
        return None

    addresses = []
    address_raw = rp_raw.get("address", {})
    if isinstance(address_raw, dict):
        for addr, addr_config in address_raw.items():
            if addr_config is None:
                addr_config = {}
            addresses.append(PimRpAddress(
                address=addr,
                groups=_ensure_list(addr_config.get("group") if isinstance(addr_config, dict) else None),
            ))

    return PimRp(
        addresses=addresses,
        keep_alive_timer=_safe_int(rp_raw.get("keep-alive-timer")),
    )


def _parse_spt_switchover(spt_raw) -> Optional[PimSptSwitchover]:
    """Parse SPT switchover configuration."""
    if not spt_raw or not isinstance(spt_raw, dict):
        return None

    infinity_config = spt_raw.get("infinity-and-beyond")
    has_infinity = infinity_config is not None or "infinity-and-beyond" in spt_raw
    prefix_list = None
    if isinstance(infinity_config, dict):
        prefix_list = infinity_config.get("prefix-list")

    return PimSptSwitchover(
        infinity_and_beyond=has_infinity,
        prefix_list=prefix_list,
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def pim_batch_configure(http_request: Request, body: PimBatchRequest):
    """Execute a batch of PIM configuration operations.

    Accepts multiple groups, each optionally scoped to a single interface.
    All groups are processed into a single builder and committed atomically.
    """
    await require_write_permission(http_request, FeatureGroup.PIM)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = PimBatchBuilder(version=version)

        for group in body.groups:
            for operation in group.operations:
                method = getattr(builder, operation.op)
                sig = inspect.signature(method)
                params = [p for p in sig.parameters.keys() if p != "self"]

                args = []

                if "iface" in params and group.interface:
                    args.append(group.interface)

                if operation.value and len(params) > len(args):
                    args.append(operation.value)

                method(*args)

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "PIM configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {str(e)}")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
