"""DHCPv6 Server Router.

API endpoints for managing VyOS DHCPv6 server configuration.

Endpoints:
  GET  /vyos/dhcpv6-server/capabilities  — version-aware feature flags
  GET  /vyos/dhcpv6-server/config        — normalized server configuration
  POST /vyos/dhcpv6-server/batch         — atomic set/delete operations
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.dhcpv6_server import DHCPv6ServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcpv6-server", tags=["dhcpv6-server"])


# ============================================================================
# Pydantic Models
# ============================================================================


class DHCPv6StaticMapping(BaseModel):
    name: str
    disabled: bool = False
    duid: Optional[str] = None        # 1.4: identifier field, 1.5: duid field
    mac: Optional[str] = None         # 1.5 only
    ipv6_address: Optional[str] = None
    ipv6_prefix: Optional[str] = None


class DHCPv6AddressRange(BaseModel):
    """Normalized address range — covers both 1.4 and 1.5 structures."""
    range_id: str                     # name (1.5) or generated key (1.4)
    start: Optional[str] = None
    stop: Optional[str] = None
    prefix: Optional[str] = None     # 1.5 named-range prefix OR 1.4 prefix-type range
    temporary: bool = False           # 1.4 prefix-range temporary flag


class DHCPv6PrefixDelegation(BaseModel):
    """Normalized prefix delegation — covers both 1.4 and 1.5 structures."""
    # 1.5 fields
    prefix: Optional[str] = None
    delegated_length: Optional[int] = None
    prefix_length: Optional[int] = None
    excluded_prefix: Optional[str] = None
    excluded_prefix_length: Optional[int] = None
    # 1.4 fields
    start: Optional[str] = None
    stop: Optional[str] = None


class DHCPv6SubnetOptions(BaseModel):
    name_servers: List[str] = []
    domain_search: List[str] = []
    info_refresh_time: Optional[int] = None
    nis_domain: Optional[str] = None
    nisplus_domain: Optional[str] = None
    nis_servers: List[str] = []
    nisplus_servers: List[str] = []
    sip_servers: List[str] = []
    sntp_servers: List[str] = []
    cisco_tftp_servers: List[str] = []


class DHCPv6Subnet(BaseModel):
    subnet: str
    disabled: bool = False
    subnet_id: Optional[int] = None       # 1.5 only
    lease_default: Optional[int] = None
    lease_minimum: Optional[int] = None
    lease_maximum: Optional[int] = None
    options: DHCPv6SubnetOptions = Field(default_factory=DHCPv6SubnetOptions)
    address_ranges: List[DHCPv6AddressRange] = []
    prefix_delegations: List[DHCPv6PrefixDelegation] = []
    static_mappings: List[DHCPv6StaticMapping] = []


class DHCPv6SharedNetwork(BaseModel):
    name: str
    description: Optional[str] = None
    disabled: bool = False
    # Network-level options (1.4: common-options, 1.5: option)
    name_servers: List[str] = []
    domain_search: List[str] = []
    info_refresh_time: Optional[int] = None
    subnets: List[DHCPv6Subnet] = []


class DHCPv6ServerConfig(BaseModel):
    disabled: bool = False
    disable_route_autoinstall: bool = False   # 1.5 only
    preference: Optional[int] = None
    global_name_servers: List[str] = []
    listen_interfaces: List[str] = []         # 1.5 only
    shared_networks: List[DHCPv6SharedNetwork] = []
    total_subnets: int = 0
    total_static_mappings: int = 0


class DHCPv6ServerBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(
        None,
        description=(
            "Arguments for the operation. "
            "Single-arg: plain string. "
            "Multi-arg: comma-separated (e.g., 'net1,2001:db8::/48')."
        ),
    )


class DHCPv6ServerBatchRequest(BaseModel):
    operations: List[DHCPv6ServerBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Internal builder method denylist
# ============================================================================

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities", "mappers", "version", "_operations", "m",
})


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_dhcpv6_server_capabilities(request: Request):
    """Return DHCPv6 server feature capabilities based on the VyOS version."""
    await require_read_permission(request, FeatureGroup.DHCPV6_SERVER)
    try:
        service = get_session_vyos_service(request)
        builder = DHCPv6ServerBatchBuilder(version=service.get_version())
        caps = builder.get_capabilities()
        if hasattr(request.state, "instance") and request.state.instance:
            caps["instance_name"] = request.state.instance.get("name")
            caps["instance_id"] = request.state.instance.get("id")
        return caps
    except Exception:
        logger.exception("Unhandled error in get_dhcpv6_server_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config
# ============================================================================


@router.get("/config", response_model=DHCPv6ServerConfig)
async def get_dhcpv6_server_config(http_request: Request, refresh: bool = False):
    """Return the full DHCPv6 server configuration in a normalized format."""
    await require_read_permission(http_request, FeatureGroup.DHCPV6_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        raw = full_config.get("service", {}).get("dhcpv6-server", {})
        if not raw:
            return DHCPv6ServerConfig()

        # Global settings
        disabled = "disable" in raw
        disable_route_autoinstall = "disable-route-autoinstall" in raw

        preference = None
        raw_pref = raw.get("preference")
        if raw_pref is not None:
            try:
                preference = int(raw_pref)
            except (ValueError, TypeError):
                pass

        global_name_servers = _parse_multi_value(
            raw.get("global-parameters", {}).get("name-server") if isinstance(raw.get("global-parameters"), dict) else None
        )

        listen_interfaces = _parse_multi_value(raw.get("listen-interface"))

        shared_networks = []
        total_subnets = 0
        total_static_mappings = 0

        for net_name, net_data in (raw.get("shared-network-name") or {}).items():
            if not isinstance(net_data, dict):
                continue

            # Network-level options: 1.5 uses 'option/', 1.4 uses 'common-options/'
            net_opts = net_data.get("option") or net_data.get("common-options") or {}

            net_name_servers = _parse_multi_value(net_opts.get("name-server"))
            net_domain_search = _parse_multi_value(net_opts.get("domain-search"))
            net_info_refresh = _parse_int(net_opts.get("info-refresh-time"))

            subnets = []
            for subnet_cidr, subnet_data in (net_data.get("subnet") or {}).items():
                if not isinstance(subnet_data, dict):
                    continue
                total_subnets += 1

                # Subnet options: 1.5 uses 'option/', 1.4 uses direct keys
                sub_opts = subnet_data.get("option") or subnet_data

                options = DHCPv6SubnetOptions(
                    name_servers=_parse_multi_value(sub_opts.get("name-server")),
                    domain_search=_parse_multi_value(sub_opts.get("domain-search")),
                    info_refresh_time=_parse_int(sub_opts.get("info-refresh-time")),
                    nis_domain=sub_opts.get("nis-domain"),
                    nisplus_domain=sub_opts.get("nisplus-domain"),
                    nis_servers=_parse_multi_value(sub_opts.get("nis-server")),
                    nisplus_servers=_parse_multi_value(sub_opts.get("nisplus-server")),
                    sip_servers=_parse_multi_value(sub_opts.get("sip-server")),
                    sntp_servers=_parse_multi_value(sub_opts.get("sntp-server")),
                    cisco_tftp_servers=_parse_cisco_tftp(subnet_data),
                )

                # Lease times
                lease_raw = subnet_data.get("lease-time") or {}
                lease_default = _parse_int(lease_raw.get("default")) if isinstance(lease_raw, dict) else None
                lease_minimum = _parse_int(lease_raw.get("minimum")) if isinstance(lease_raw, dict) else None
                lease_maximum = _parse_int(lease_raw.get("maximum")) if isinstance(lease_raw, dict) else None

                # Address ranges (1.5 named ranges)
                address_ranges = []
                for range_id, range_data in (subnet_data.get("range") or {}).items():
                    if not isinstance(range_data, dict):
                        continue
                    address_ranges.append(DHCPv6AddressRange(
                        range_id=range_id,
                        start=range_data.get("start"),
                        stop=range_data.get("stop"),
                        prefix=range_data.get("prefix"),
                    ))

                # Address ranges (1.4: address-range/start/<s>/stop)
                addr_range_raw = subnet_data.get("address-range") or {}
                if isinstance(addr_range_raw, dict):
                    for start_addr, start_data in (addr_range_raw.get("start") or {}).items():
                        stop_addr = start_data.get("stop") if isinstance(start_data, dict) else None
                        address_ranges.append(DHCPv6AddressRange(
                            range_id=f"start_{start_addr}",
                            start=start_addr,
                            stop=stop_addr,
                        ))
                    for prefix_val, prefix_data in (addr_range_raw.get("prefix") or {}).items():
                        temporary = isinstance(prefix_data, dict) and "temporary" in prefix_data
                        address_ranges.append(DHCPv6AddressRange(
                            range_id=f"prefix_{prefix_val}",
                            prefix=prefix_val,
                            temporary=temporary,
                        ))

                # Prefix delegations (1.5: prefix-delegation/prefix/<p>/...)
                prefix_delegations = []
                pd_raw = subnet_data.get("prefix-delegation") or {}
                if isinstance(pd_raw, dict):
                    for pd_prefix, pd_data in (pd_raw.get("prefix") or {}).items():
                        if not isinstance(pd_data, dict):
                            continue
                        prefix_delegations.append(DHCPv6PrefixDelegation(
                            prefix=pd_prefix,
                            delegated_length=_parse_int(pd_data.get("delegated-length")),
                            prefix_length=_parse_int(pd_data.get("prefix-length")),
                            excluded_prefix=pd_data.get("excluded-prefix"),
                            excluded_prefix_length=_parse_int(pd_data.get("excluded-prefix-length")),
                        ))
                    # 1.4: prefix-delegation/start/<s>/...
                    for pd_start, pd_data in (pd_raw.get("start") or {}).items():
                        if not isinstance(pd_data, dict):
                            continue
                        prefix_delegations.append(DHCPv6PrefixDelegation(
                            start=pd_start,
                            stop=pd_data.get("stop"),
                            prefix_length=_parse_int(pd_data.get("prefix-length")),
                        ))

                # Static mappings
                static_mappings = []
                for mapping_name, mapping_data in (subnet_data.get("static-mapping") or {}).items():
                    if not isinstance(mapping_data, dict):
                        continue
                    total_static_mappings += 1
                    # 1.4 uses 'identifier', 1.5 uses 'duid'
                    duid = mapping_data.get("duid") or mapping_data.get("identifier")
                    static_mappings.append(DHCPv6StaticMapping(
                        name=mapping_name,
                        disabled="disable" in mapping_data,
                        duid=duid,
                        mac=mapping_data.get("mac"),
                        ipv6_address=mapping_data.get("ipv6-address"),
                        ipv6_prefix=mapping_data.get("ipv6-prefix"),
                    ))

                subnets.append(DHCPv6Subnet(
                    subnet=subnet_cidr,
                    disabled="disable" in subnet_data,
                    subnet_id=_parse_int(subnet_data.get("subnet-id")),
                    lease_default=lease_default,
                    lease_minimum=lease_minimum,
                    lease_maximum=lease_maximum,
                    options=options,
                    address_ranges=address_ranges,
                    prefix_delegations=prefix_delegations,
                    static_mappings=static_mappings,
                ))

            shared_networks.append(DHCPv6SharedNetwork(
                name=net_name,
                description=net_data.get("description"),
                disabled="disable" in net_data,
                name_servers=net_name_servers,
                domain_search=net_domain_search,
                info_refresh_time=net_info_refresh,
                subnets=subnets,
            ))

        return DHCPv6ServerConfig(
            disabled=disabled,
            disable_route_autoinstall=disable_route_autoinstall,
            preference=preference,
            global_name_servers=global_name_servers,
            listen_interfaces=listen_interfaces,
            shared_networks=shared_networks,
            total_subnets=total_subnets,
            total_static_mappings=total_static_mappings,
        )

    except Exception:
        logger.exception("Unhandled error in get_dhcpv6_server_config")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def dhcpv6_server_batch_configure(
    http_request: Request, body: DHCPv6ServerBatchRequest
):
    """Execute a batch of DHCPv6 server configuration operations atomically."""
    await require_write_permission(http_request, FeatureGroup.DHCPV6_SERVER)
    try:
        service = get_session_vyos_service(http_request)
        builder = DHCPv6ServerBatchBuilder(version=service.get_version())

        for operation in body.operations:
            if operation.op in _INTERNAL_BUILDER_METHODS or operation.op.startswith("_"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Operation not allowed: {operation.op}",
                )

            if not hasattr(builder, operation.op):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}",
                )

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
            else:
                if operation.value and "," in operation.value:
                    parts = operation.value.split(",", len(params) - 1)
                    method(*parts)
                elif operation.value:
                    method(operation.value)

        response = service.execute_batch(builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "DHCPv6 server configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except AttributeError as e:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {e}")
    except Exception:
        logger.exception("Unhandled error in dhcpv6_server_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config parse helpers
# ============================================================================


def _parse_multi_value(raw) -> List[str]:
    """Normalize multi-value nodes (dict keys, list, or single string) to a list."""
    if not raw:
        return []
    if isinstance(raw, dict):
        return sorted(raw.keys())
    if isinstance(raw, list):
        return list(raw)
    if isinstance(raw, str):
        return [raw]
    return []


def _parse_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_cisco_tftp(subnet_data: dict) -> List[str]:
    """Extract Cisco TFTP servers from both 1.4 (vendor-option/) and 1.5 (option/vendor-option/) paths."""
    # 1.5: subnet_data["option"]["vendor-option"]["cisco"]["tftp-server"]
    opt_path = subnet_data.get("option") or {}
    vendor_15 = opt_path.get("vendor-option") or {}
    cisco_15 = vendor_15.get("cisco") or {}
    tftp_15 = cisco_15.get("tftp-server")

    # 1.4: subnet_data["vendor-option"]["cisco"]["tftp-server"]
    vendor_14 = subnet_data.get("vendor-option") or {}
    cisco_14 = vendor_14.get("cisco") or {}
    tftp_14 = cisco_14.get("tftp-server")

    return _parse_multi_value(tftp_15 or tftp_14)
