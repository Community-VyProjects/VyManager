"""
MPLS Protocol Router

API endpoints for managing VyOS MPLS (Multiprotocol Label Switching) and
LDP (Label Distribution Protocol) configuration.  Supports version-aware
configuration for VyOS 1.4 and 1.5 (identical template structure on both).

Endpoints:
  GET  /vyos/mpls/capabilities  — version-aware feature flags
  GET  /vyos/mpls/config        — normalized MPLS/LDP configuration
  POST /vyos/mpls/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.mpls import MplsBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/mpls", tags=["mpls"])


# ============================================================================
# Pydantic Models
# ============================================================================


class MplsParameters(BaseModel):
    """Global MPLS parameters."""
    maximum_ttl: Optional[int] = None
    no_propagate_ttl: bool = False


class MplsLdpDiscovery(BaseModel):
    """LDP discovery timer and transport address settings."""
    hello_ipv4_holdtime: Optional[int] = None
    hello_ipv4_interval: Optional[int] = None
    hello_ipv6_holdtime: Optional[int] = None
    hello_ipv6_interval: Optional[int] = None
    session_ipv4_holdtime: Optional[int] = None
    session_ipv6_holdtime: Optional[int] = None
    transport_ipv4_address: Optional[str] = None
    transport_ipv6_address: Optional[str] = None


class MplsLdpAllocation(BaseModel):
    """LDP FEC allocation filtering."""
    ipv4_access_list: Optional[str] = None
    ipv6_access_list: Optional[str] = None


class MplsLdpExportFilter(BaseModel):
    """LDP export filter (FEC + neighbor ACLs)."""
    filter_access_list: Optional[str] = None
    neighbor_access_list: Optional[str] = None


class MplsLdpExport(BaseModel):
    """LDP label export configuration."""
    ipv4_explicit_null: bool = False
    ipv4_export_filter: MplsLdpExportFilter = Field(default_factory=MplsLdpExportFilter)
    ipv6_explicit_null: bool = False
    ipv6_export_filter: MplsLdpExportFilter = Field(default_factory=MplsLdpExportFilter)


class MplsLdpImportFilter(BaseModel):
    """LDP import filter (FEC + neighbor ACLs)."""
    filter_access_list: Optional[str] = None
    neighbor_access_list: Optional[str] = None


class MplsLdpImportConfig(BaseModel):
    """LDP label import configuration."""
    ipv4_import_filter: MplsLdpImportFilter = Field(default_factory=MplsLdpImportFilter)
    ipv6_import_filter: MplsLdpImportFilter = Field(default_factory=MplsLdpImportFilter)


class MplsLdpNeighbor(BaseModel):
    """LDP neighbor-specific settings."""
    address: str
    password: Optional[str] = None
    session_holdtime: Optional[int] = None
    ttl_security: Optional[str] = None


class MplsLdpInterface(BaseModel):
    """LDP interface configuration."""
    name: str
    disable_establish_hello: bool = False


class MplsLdpTargetedNeighborIpv4(BaseModel):
    """LDP targeted neighbor IPv4 settings."""
    enable: bool = False
    addresses: List[str] = []
    hello_holdtime: Optional[int] = None
    hello_interval: Optional[int] = None


class MplsLdpTargetedNeighborIpv6(BaseModel):
    """LDP targeted neighbor IPv6 settings."""
    enable: bool = False
    addresses: List[str] = []
    hello_holdtime: Optional[int] = None
    hello_interval: Optional[int] = None


class MplsLdpParameters(BaseModel):
    """LDP miscellaneous parameters."""
    cisco_interop_tlv: bool = False
    ordered_control: bool = False
    transport_prefer_ipv4: bool = False


class MplsLdpConfig(BaseModel):
    """Complete LDP configuration."""
    router_id: Optional[str] = None
    interfaces: List[MplsLdpInterface] = []
    neighbors: List[MplsLdpNeighbor] = []
    discovery: MplsLdpDiscovery = Field(default_factory=MplsLdpDiscovery)
    allocation: MplsLdpAllocation = Field(default_factory=MplsLdpAllocation)
    export: MplsLdpExport = Field(default_factory=MplsLdpExport)
    ldp_import: MplsLdpImportConfig = Field(default_factory=MplsLdpImportConfig)
    targeted_neighbor_ipv4: MplsLdpTargetedNeighborIpv4 = Field(default_factory=MplsLdpTargetedNeighborIpv4)
    targeted_neighbor_ipv6: MplsLdpTargetedNeighborIpv6 = Field(default_factory=MplsLdpTargetedNeighborIpv6)
    parameters: MplsLdpParameters = Field(default_factory=MplsLdpParameters)


class MplsConfig(BaseModel):
    """Complete MPLS configuration."""
    enabled: bool = False
    interfaces: List[str] = []
    parameters: MplsParameters = Field(default_factory=MplsParameters)
    ldp: Optional[MplsLdpConfig] = None


class MplsBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Argument(s) for the operation. "
            "Single-arg methods: plain string. "
            "Two-arg methods: 'arg1,arg2' (comma-separated)."
        ),
    )


class MplsBatchRequest(BaseModel):
    """Batch configuration request."""
    operations: List[MplsBatchOperation]


class VyOSResponse(BaseModel):
    """Standard VyOS operation response."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_mpls_capabilities(request: Request):
    """Return MPLS feature capabilities based on the connected VyOS version."""
    await require_read_permission(request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(request)
        builder = MplsBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=MplsConfig)
async def get_mpls_config(http_request: Request, refresh: bool = False):
    """Return the full MPLS/LDP configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        mpls_raw = full_config.get("protocols", {}).get("mpls", {})
        if not mpls_raw:
            return MplsConfig(enabled=False)

        return MplsConfig(
            enabled=True,
            interfaces=_parse_global_interfaces(mpls_raw),
            parameters=_parse_parameters(mpls_raw.get("parameters", {}) or {}),
            ldp=_parse_ldp(mpls_raw.get("ldp", {})) if mpls_raw.get("ldp") else None,
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def mpls_batch_configure(http_request: Request, body: MplsBatchRequest):
    """Execute a batch of MPLS/LDP configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.MPLS)
    try:
        service = get_session_vyos_service(http_request)
        builder = MplsBatchBuilder(version=service.get_version())

        for operation in body.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]

            if len(params) == 0:
                method()
            elif len(params) == 1:
                if operation.value is not None:
                    method(operation.value)
                else:
                    method()
            elif len(params) == 2:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", 1)
                    method(parts[0], parts[1])
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "MPLS configuration updated"},
            error=response.error if response.error else None,
        )
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Parsers
# ============================================================================


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _to_list(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def _parse_global_interfaces(raw: dict) -> List[str]:
    """Parse the multi-value 'interface' leaf under protocols/mpls."""
    iface_raw = raw.get("interface", {})
    if isinstance(iface_raw, dict):
        return sorted(iface_raw.keys())
    return sorted(_to_list(iface_raw))


def _parse_parameters(raw: dict) -> MplsParameters:
    if not raw:
        return MplsParameters()
    return MplsParameters(
        maximum_ttl=_safe_int(raw.get("maximum-ttl")),
        no_propagate_ttl="no-propagate-ttl" in raw,
    )


def _parse_ldp(raw: dict) -> MplsLdpConfig:
    if not raw:
        return MplsLdpConfig()

    return MplsLdpConfig(
        router_id=raw.get("router-id"),
        interfaces=_parse_ldp_interfaces(raw.get("interface", {})),
        neighbors=_parse_ldp_neighbors(raw.get("neighbor", {})),
        discovery=_parse_ldp_discovery(raw.get("discovery", {}) or {}),
        allocation=_parse_ldp_allocation(raw.get("allocation", {}) or {}),
        export=_parse_ldp_export(raw.get("export", {}) or {}),
        ldp_import=_parse_ldp_import(raw.get("import", {}) or {}),
        targeted_neighbor_ipv4=_parse_ldp_targeted_ipv4(
            (raw.get("targeted-neighbor", {}) or {}).get("ipv4", {}) or {}
        ),
        targeted_neighbor_ipv6=_parse_ldp_targeted_ipv6(
            (raw.get("targeted-neighbor", {}) or {}).get("ipv6", {}) or {}
        ),
        parameters=_parse_ldp_parameters(raw.get("parameters", {}) or {}),
    )


def _parse_ldp_interfaces(raw: dict) -> List[MplsLdpInterface]:
    """Parse LDP interfaces (tag node with optional disable-establish-hello)."""
    if not raw:
        return []
    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        interfaces.append(MplsLdpInterface(
            name=iface_name,
            disable_establish_hello="disable-establish-hello" in cfg,
        ))
    return sorted(interfaces, key=lambda x: x.name)


def _parse_ldp_neighbors(raw: dict) -> List[MplsLdpNeighbor]:
    """Parse LDP neighbors (tag node keyed by IPv4 address)."""
    if not raw:
        return []
    neighbors = []
    for addr, cfg in raw.items():
        if cfg is None:
            cfg = {}
        neighbors.append(MplsLdpNeighbor(
            address=addr,
            password=cfg.get("password"),
            session_holdtime=_safe_int(cfg.get("session-holdtime")),
            ttl_security=str(cfg.get("ttl-security")) if cfg.get("ttl-security") is not None else None,
        ))
    return sorted(neighbors, key=lambda x: x.address)


def _parse_ldp_discovery(raw: dict) -> MplsLdpDiscovery:
    if not raw:
        return MplsLdpDiscovery()
    return MplsLdpDiscovery(
        hello_ipv4_holdtime=_safe_int(raw.get("hello-ipv4-holdtime")),
        hello_ipv4_interval=_safe_int(raw.get("hello-ipv4-interval")),
        hello_ipv6_holdtime=_safe_int(raw.get("hello-ipv6-holdtime")),
        hello_ipv6_interval=_safe_int(raw.get("hello-ipv6-interval")),
        session_ipv4_holdtime=_safe_int(raw.get("session-ipv4-holdtime")),
        session_ipv6_holdtime=_safe_int(raw.get("session-ipv6-holdtime")),
        transport_ipv4_address=raw.get("transport-ipv4-address"),
        transport_ipv6_address=raw.get("transport-ipv6-address"),
    )


def _parse_ldp_allocation(raw: dict) -> MplsLdpAllocation:
    if not raw:
        return MplsLdpAllocation()
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return MplsLdpAllocation(
        ipv4_access_list=ipv4_raw.get("access-list"),
        ipv6_access_list=ipv6_raw.get("access-list6"),
    )


def _parse_ldp_export_filter(raw: dict, acl_key: str, neighbor_key: str) -> MplsLdpExportFilter:
    ef_raw = raw.get("export-filter", {}) or {}
    return MplsLdpExportFilter(
        filter_access_list=ef_raw.get(acl_key),
        neighbor_access_list=ef_raw.get(neighbor_key),
    )


def _parse_ldp_export(raw: dict) -> MplsLdpExport:
    if not raw:
        return MplsLdpExport()
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return MplsLdpExport(
        ipv4_explicit_null="explicit-null" in ipv4_raw,
        ipv4_export_filter=_parse_ldp_export_filter(ipv4_raw, "filter-access-list", "neighbor-access-list"),
        ipv6_explicit_null="explicit-null" in ipv6_raw,
        ipv6_export_filter=_parse_ldp_export_filter(ipv6_raw, "filter-access-list6", "neighbor-access-list6"),
    )


def _parse_ldp_import_filter(raw: dict, acl_key: str, neighbor_key: str) -> MplsLdpImportFilter:
    if_raw = raw.get("import-filter", {}) or {}
    return MplsLdpImportFilter(
        filter_access_list=if_raw.get(acl_key),
        neighbor_access_list=if_raw.get(neighbor_key),
    )


def _parse_ldp_import(raw: dict) -> MplsLdpImportConfig:
    if not raw:
        return MplsLdpImportConfig()
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return MplsLdpImportConfig(
        ipv4_import_filter=_parse_ldp_import_filter(ipv4_raw, "filter-access-list", "neighbor-access-list"),
        ipv6_import_filter=_parse_ldp_import_filter(ipv6_raw, "filter-access-list6", "neighbor-access-list6"),
    )


def _parse_ldp_targeted_ipv4(raw: dict) -> MplsLdpTargetedNeighborIpv4:
    if not raw:
        return MplsLdpTargetedNeighborIpv4()
    addr_raw = raw.get("address", {})
    addresses = list(addr_raw.keys()) if isinstance(addr_raw, dict) else _to_list(addr_raw)
    return MplsLdpTargetedNeighborIpv4(
        enable="enable" in raw,
        addresses=sorted(addresses),
        hello_holdtime=_safe_int(raw.get("hello-holdtime")),
        hello_interval=_safe_int(raw.get("hello-interval")),
    )


def _parse_ldp_targeted_ipv6(raw: dict) -> MplsLdpTargetedNeighborIpv6:
    if not raw:
        return MplsLdpTargetedNeighborIpv6()
    addr_raw = raw.get("address", {})
    addresses = list(addr_raw.keys()) if isinstance(addr_raw, dict) else _to_list(addr_raw)
    return MplsLdpTargetedNeighborIpv6(
        enable="enable" in raw,
        addresses=sorted(addresses),
        hello_holdtime=_safe_int(raw.get("hello-holdtime")),
        hello_interval=_safe_int(raw.get("hello-interval")),
    )


def _parse_ldp_parameters(raw: dict) -> MplsLdpParameters:
    if not raw:
        return MplsLdpParameters()
    return MplsLdpParameters(
        cisco_interop_tlv="cisco-interop-tlv" in raw,
        ordered_control="ordered-control" in raw,
        transport_prefer_ipv4="transport-prefer-ipv4" in raw,
    )
