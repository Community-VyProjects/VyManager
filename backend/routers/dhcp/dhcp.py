"""
DHCP Server Router

API endpoints for managing VyOS DHCP server configuration.
Supports shared networks, subnets, ranges, static mappings, and options.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import DHCPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import ipaddress
import httpx
from datetime import datetime, timezone
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcp", tags=["dhcp"])


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Request/Response Models
# ============================================================================


class DHCPRange(BaseModel):
    """DHCP range configuration."""

    range_id: str = Field(..., description="Range identifier (numeric)")
    start: Optional[str] = None
    stop: Optional[str] = None


class DHCPStaticMapping(BaseModel):
    """DHCP static mapping configuration."""

    name: str = Field(..., description="Static mapping name")
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False


class DHCPSubnet(BaseModel):
    """DHCP subnet configuration."""

    subnet: str = Field(..., description="Subnet CIDR (e.g., 192.168.1.0/24)")
    subnet_id: Optional[int] = Field(
        None, description="Subnet ID (required in VyOS 1.5)"
    )
    description: Optional[str] = None
    disable: bool = False
    default_router: Optional[str] = None
    name_servers: List[str] = []
    domain_name: Optional[str] = None
    domain_search: List[str] = []
    lease: Optional[str] = None
    ranges: List[DHCPRange] = []
    excludes: List[str] = []
    static_mappings: List[DHCPStaticMapping] = []
    ping_check: bool = False
    enable_failover: bool = False
    # Additional options
    bootfile_name: Optional[str] = None
    bootfile_server: Optional[str] = None
    tftp_server_name: Optional[str] = None
    time_servers: List[str] = []
    ntp_servers: List[str] = []
    wins_servers: List[str] = []
    time_offset: Optional[str] = None
    client_prefix_length: Optional[str] = None
    wpad_url: Optional[str] = None


class DHCPSharedNetwork(BaseModel):
    """DHCP shared network configuration."""

    name: str = Field(..., description="Shared network name")
    description: Optional[str] = None
    disable: bool = False
    authoritative: bool = False
    name_servers: List[str] = []
    domain_name: Optional[str] = None
    domain_search: List[str] = []
    ping_check: bool = False
    subnets: List[DHCPSubnet] = []


class DHCPFailoverConfig(BaseModel):
    """DHCP failover/high availability configuration."""

    mode: Optional[str] = None  # active-active or active-passive
    name: Optional[str] = None
    source_address: Optional[str] = None
    remote: Optional[str] = None
    status: Optional[str] = None  # primary or secondary


class DHCPGlobalConfig(BaseModel):
    """DHCP global configuration."""

    listen_addresses: List[str] = []
    hostfile_update: bool = False
    host_decl_name: bool = False
    disable: bool = False


class DHCPConfigResponse(BaseModel):
    """Response containing all DHCP configurations."""

    shared_networks: List[DHCPSharedNetwork] = []
    failover: Optional[DHCPFailoverConfig] = None
    global_config: DHCPGlobalConfig = DHCPGlobalConfig()
    total_subnets: int = 0
    total_static_mappings: int = 0


class DHCPBatchOperation(BaseModel):
    """Single operation in a batch request."""

    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class DHCPBatchRequest(BaseModel):
    """Model for batch DHCP configuration."""

    network_name: str = Field(..., description="Shared network name")
    subnet: Optional[str] = Field(None, description="Subnet (if operation is subnet-specific)")
    operations: List[DHCPBatchOperation] = Field(
        ..., description="List of operations to perform"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "network_name": "LAN",
                "subnet": "192.168.1.0/24",
                "operations": [
                    {"op": "set_subnet_default_router", "value": "192.168.1.1"},
                    {"op": "set_subnet_name_server", "value": "8.8.8.8"},
                    {"op": "set_subnet_domain_name", "value": "local.lan"},
                    {"op": "set_subnet_lease", "value": "86400"},
                ],
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DHCPLease(BaseModel):
    """DHCP active lease information."""

    ip_address: str = Field(..., description="IP address leased")
    mac_address: str = Field(..., description="MAC address of client")
    state: str = Field(..., description="Lease state (active, expired, etc.)")
    lease_start: str = Field(..., description="Lease start time")
    lease_expiration: str = Field(..., description="Lease expiration time")
    remaining: str = Field(..., description="Remaining lease time")
    pool: str = Field(..., description="Pool name")
    hostname: Optional[str] = Field(None, description="Client hostname")
    origin: str = Field(..., description="Lease origin (local, remote)")


class DHCPLeasesResponse(BaseModel):
    """Response containing DHCP leases."""

    leases: List[DHCPLease] = []
    total: int = 0


class DHCPClearLeaseRequest(BaseModel):
    """Request to clear/release a single DHCP lease."""

    ip_address: str = Field(..., description="IP address of the lease to clear")
    vrf: Optional[str] = Field(None, description="VRF the lease belongs to (1.5 only)")


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_dhcp_capabilities(request: Request):
    """
    Get DHCP capabilities based on device VyOS version.

    Returns feature flags indicating which DHCP features are supported.
    This allows frontends to conditionally enable/disable features based on version.
    """
    # Check RBAC permission
    await require_read_permission(request, FeatureGroup.DHCP)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = DHCPBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=DHCPConfigResponse)
async def get_dhcp_config(http_request: Request, refresh: bool = False):
    """
    Get all DHCP server configurations from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all DHCP shared networks, subnets, and options
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.DHCP)

    try:
        # Get service and retrieve raw config from cache
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return DHCPConfigResponse()

        service_config = full_config["service"]

        if "dhcp-server" not in service_config:
            return DHCPConfigResponse()

        dhcp_config = service_config["dhcp-server"]

        shared_networks = []
        total_subnets = 0
        total_static_mappings = 0

        # Parse global configuration
        global_config = DHCPGlobalConfig(
            listen_addresses=list(dhcp_config.get("listen-address", {}).keys())
            if isinstance(dhcp_config.get("listen-address"), dict)
            else [],
            hostfile_update="hostfile-update" in dhcp_config,
            host_decl_name="host-decl-name" in dhcp_config,
            disable="disable" in dhcp_config,
        )

        # Parse failover configuration
        failover = None
        if "high-availability" in dhcp_config:
            ha_config = dhcp_config["high-availability"]
            failover = DHCPFailoverConfig(
                mode=ha_config.get("mode"),
                name=ha_config.get("name"),
                source_address=ha_config.get("source-address"),
                remote=ha_config.get("remote"),
                status=ha_config.get("status"),
            )

        # Parse shared networks
        if "shared-network-name" in dhcp_config:
            for network_name, network_data in dhcp_config[
                "shared-network-name"
            ].items():
                # Resolve option container (v1.5 uses 'option' prefix at network level)
                network_opts = network_data.get("option", network_data)

                # Parse network-level name-servers (check option prefix for v1.5, direct for v1.4)
                network_name_servers = []
                ns_raw = network_opts.get("name-server") or network_data.get("name-server")
                if ns_raw:
                    if isinstance(ns_raw, dict):
                        network_name_servers = list(ns_raw.keys())
                    elif isinstance(ns_raw, list):
                        network_name_servers = ns_raw
                    elif isinstance(ns_raw, str):
                        network_name_servers = [ns_raw]

                # Parse network-level domain-search (check option prefix for v1.5)
                network_domain_search = []
                ds_raw = network_opts.get("domain-search") or network_data.get("domain-search")
                if ds_raw:
                    if isinstance(ds_raw, dict):
                        network_domain_search = list(ds_raw.keys())
                    elif isinstance(ds_raw, list):
                        network_domain_search = ds_raw
                    elif isinstance(ds_raw, str):
                        network_domain_search = [ds_raw]

                # Parse network-level domain-name (check option prefix for v1.5)
                network_domain_name = (
                    network_opts.get("domain-name") or network_data.get("domain-name")
                )

                subnets = []

                # Parse subnets
                if "subnet" in network_data:
                    for subnet_cidr, subnet_data in network_data["subnet"].items():
                        total_subnets += 1

                        # Parse subnet name-servers (check both direct and option paths)
                        subnet_name_servers = []
                        # VyOS 1.5 uses 'option' prefix
                        if "option" in subnet_data and "name-server" in subnet_data["option"]:
                            ns_data = subnet_data["option"]["name-server"]
                            if isinstance(ns_data, dict):
                                subnet_name_servers = list(ns_data.keys())
                            elif isinstance(ns_data, list):
                                subnet_name_servers = ns_data
                            elif isinstance(ns_data, str):
                                subnet_name_servers = [ns_data]
                        # VyOS 1.4 direct path
                        elif "name-server" in subnet_data:
                            ns_data = subnet_data["name-server"]
                            if isinstance(ns_data, dict):
                                subnet_name_servers = list(ns_data.keys())
                            elif isinstance(ns_data, list):
                                subnet_name_servers = ns_data
                            elif isinstance(ns_data, str):
                                subnet_name_servers = [ns_data]

                        # Parse default router (check both paths)
                        default_router = None
                        if "option" in subnet_data and "default-router" in subnet_data["option"]:
                            default_router = subnet_data["option"]["default-router"]
                        elif "default-router" in subnet_data:
                            default_router = subnet_data["default-router"]

                        # Parse domain-name (check both paths)
                        domain_name = None
                        if "option" in subnet_data and "domain-name" in subnet_data["option"]:
                            domain_name = subnet_data["option"]["domain-name"]
                        elif "domain-name" in subnet_data:
                            domain_name = subnet_data["domain-name"]

                        # Parse domain-search (check both paths)
                        subnet_domain_search = []
                        if "option" in subnet_data and "domain-search" in subnet_data["option"]:
                            ds_data = subnet_data["option"]["domain-search"]
                            if isinstance(ds_data, dict):
                                subnet_domain_search = list(ds_data.keys())
                            elif isinstance(ds_data, list):
                                subnet_domain_search = ds_data
                            elif isinstance(ds_data, str):
                                subnet_domain_search = [ds_data]
                        elif "domain-search" in subnet_data:
                            ds_data = subnet_data["domain-search"]
                            if isinstance(ds_data, dict):
                                subnet_domain_search = list(ds_data.keys())
                            elif isinstance(ds_data, list):
                                subnet_domain_search = ds_data
                            elif isinstance(ds_data, str):
                                subnet_domain_search = [ds_data]

                        # Parse ranges
                        ranges = []
                        if "range" in subnet_data:
                            for range_id, range_data in subnet_data["range"].items():
                                ranges.append(
                                    DHCPRange(
                                        range_id=str(range_id),
                                        start=range_data.get("start"),
                                        stop=range_data.get("stop"),
                                    )
                                )

                        # Parse excludes
                        excludes = []
                        if "exclude" in subnet_data:
                            exclude_data = subnet_data["exclude"]
                            if isinstance(exclude_data, dict):
                                excludes = list(exclude_data.keys())
                            elif isinstance(exclude_data, list):
                                excludes = exclude_data
                            elif isinstance(exclude_data, str):
                                excludes = [exclude_data]

                        # Parse static mappings
                        static_mappings = []
                        if "static-mapping" in subnet_data:
                            for mapping_name, mapping_data in subnet_data[
                                "static-mapping"
                            ].items():
                                total_static_mappings += 1
                                # v1.4 uses 'mac-address', v1.5 uses 'mac'
                                mac_addr = mapping_data.get("mac") or mapping_data.get("mac-address")
                                static_mappings.append(
                                    DHCPStaticMapping(
                                        name=mapping_name,
                                        ip_address=mapping_data.get("ip-address"),
                                        mac_address=mac_addr,
                                        description=mapping_data.get("description"),
                                        disable="disable" in mapping_data,
                                    )
                                )

                        # Parse time servers (check both paths)
                        time_servers = []
                        if "option" in subnet_data and "time-server" in subnet_data["option"]:
                            ts_data = subnet_data["option"]["time-server"]
                            if isinstance(ts_data, dict):
                                time_servers = list(ts_data.keys())
                            elif isinstance(ts_data, list):
                                time_servers = ts_data
                            elif isinstance(ts_data, str):
                                time_servers = [ts_data]
                        elif "time-server" in subnet_data:
                            ts_data = subnet_data["time-server"]
                            if isinstance(ts_data, dict):
                                time_servers = list(ts_data.keys())
                            elif isinstance(ts_data, list):
                                time_servers = ts_data
                            elif isinstance(ts_data, str):
                                time_servers = [ts_data]

                        # Parse NTP servers (check both paths)
                        ntp_servers = []
                        if "option" in subnet_data and "ntp-server" in subnet_data["option"]:
                            ntp_data = subnet_data["option"]["ntp-server"]
                            if isinstance(ntp_data, dict):
                                ntp_servers = list(ntp_data.keys())
                            elif isinstance(ntp_data, list):
                                ntp_servers = ntp_data
                            elif isinstance(ntp_data, str):
                                ntp_servers = [ntp_data]
                        elif "ntp-server" in subnet_data:
                            ntp_data = subnet_data["ntp-server"]
                            if isinstance(ntp_data, dict):
                                ntp_servers = list(ntp_data.keys())
                            elif isinstance(ntp_data, list):
                                ntp_servers = ntp_data
                            elif isinstance(ntp_data, str):
                                ntp_servers = [ntp_data]

                        # Parse WINS servers (check both paths)
                        wins_servers = []
                        if "option" in subnet_data and "wins-server" in subnet_data["option"]:
                            wins_data = subnet_data["option"]["wins-server"]
                            if isinstance(wins_data, dict):
                                wins_servers = list(wins_data.keys())
                            elif isinstance(wins_data, list):
                                wins_servers = wins_data
                            elif isinstance(wins_data, str):
                                wins_servers = [wins_data]
                        elif "wins-server" in subnet_data:
                            wins_data = subnet_data["wins-server"]
                            if isinstance(wins_data, dict):
                                wins_servers = list(wins_data.keys())
                            elif isinstance(wins_data, list):
                                wins_servers = wins_data
                            elif isinstance(wins_data, str):
                                wins_servers = [wins_data]

                        # Parse bootfile-name (check both paths)
                        bootfile_name = None
                        if "option" in subnet_data and "bootfile-name" in subnet_data["option"]:
                            bootfile_name = subnet_data["option"]["bootfile-name"]
                        elif "bootfile-name" in subnet_data:
                            bootfile_name = subnet_data["bootfile-name"]

                        # Parse bootfile-server (check both paths)
                        bootfile_server = None
                        if "option" in subnet_data and "bootfile-server" in subnet_data["option"]:
                            bootfile_server = subnet_data["option"]["bootfile-server"]
                        elif "bootfile-server" in subnet_data:
                            bootfile_server = subnet_data["bootfile-server"]

                        # Parse tftp-server-name (check both paths)
                        tftp_server_name = None
                        if "option" in subnet_data and "tftp-server-name" in subnet_data["option"]:
                            tftp_server_name = subnet_data["option"]["tftp-server-name"]
                        elif "tftp-server-name" in subnet_data:
                            tftp_server_name = subnet_data["tftp-server-name"]

                        # Parse time-offset (check both paths)
                        time_offset = None
                        if "option" in subnet_data and "time-offset" in subnet_data["option"]:
                            time_offset = subnet_data["option"]["time-offset"]
                        elif "time-offset" in subnet_data:
                            time_offset = subnet_data["time-offset"]

                        # Parse client-prefix-length (check both option and direct paths)
                        subnet_opts = subnet_data.get("option", {})
                        client_prefix_length = (
                            subnet_opts.get("client-prefix-length")
                            or subnet_data.get("client-prefix-length")
                        )
                        if client_prefix_length is not None:
                            client_prefix_length = str(client_prefix_length)

                        # Parse wpad-url (check both option and direct paths)
                        wpad_url = (
                            subnet_opts.get("wpad-url")
                            or subnet_data.get("wpad-url")
                        )

                        subnet = DHCPSubnet(
                            subnet=subnet_cidr,
                            subnet_id=subnet_data.get("subnet-id"),
                            description=subnet_data.get("description"),
                            disable="disable" in subnet_data,
                            default_router=default_router,
                            name_servers=subnet_name_servers,
                            domain_name=domain_name,
                            domain_search=subnet_domain_search,
                            lease=subnet_data.get("lease"),
                            ranges=ranges,
                            excludes=excludes,
                            static_mappings=static_mappings,
                            ping_check="ping-check" in subnet_data,
                            enable_failover="enable-failover" in subnet_data,
                            bootfile_name=bootfile_name,
                            bootfile_server=bootfile_server,
                            tftp_server_name=tftp_server_name,
                            time_servers=time_servers,
                            ntp_servers=ntp_servers,
                            wins_servers=wins_servers,
                            time_offset=time_offset,
                            client_prefix_length=client_prefix_length,
                            wpad_url=wpad_url,
                        )
                        subnets.append(subnet)

                network = DHCPSharedNetwork(
                    name=network_name,
                    description=network_data.get("description"),
                    disable="disable" in network_data,
                    authoritative="authoritative" in network_data,
                    name_servers=network_name_servers,
                    domain_name=network_domain_name,
                    domain_search=network_domain_search,
                    ping_check="ping-check" in network_data,
                    subnets=subnets,
                )
                shared_networks.append(network)

        return DHCPConfigResponse(
            shared_networks=shared_networks,
            failover=failover,
            global_config=global_config,
            total_subnets=total_subnets,
            total_static_mappings=total_static_mappings,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def _format_lease_time(value: Any) -> str:
    """Format a lease timestamp from the GraphQL op (epoch seconds) to a string."""
    if value is None:
        return ""
    # GraphQL returns epoch seconds (float); fall back to str for anything else.
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        except (ValueError, OSError, OverflowError):
            return str(value)
    return str(value)


def _normalize_hostname(value: Any) -> Optional[str]:
    """VyOS reports an unknown hostname as '-'; normalize that to None."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or text == "-":
        return None
    return text


def _parse_gql_lease_rows(rows: Any) -> List[DHCPLease]:
    """Convert the JSON rows from ShowServerLeasesDhcp into DHCPLease models."""
    leases: List[DHCPLease] = []
    if not isinstance(rows, list):
        return leases
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            leases.append(DHCPLease(
                ip_address=str(row.get("ip", "")),
                mac_address=str(row.get("mac", "")),
                state=str(row.get("state", "")),
                lease_start=_format_lease_time(row.get("start")),
                lease_expiration=_format_lease_time(row.get("end")),
                remaining=str(row.get("remaining") or ""),
                pool=str(row.get("pool") or ""),
                hostname=_normalize_hostname(row.get("hostname")),
                origin=str(row.get("origin") or "local"),
            ))
        except ValueError as e:
            logger.warning("Could not parse GraphQL lease row %s: %s", row, e)
    return leases


async def _fetch_leases_graphql(service) -> List[DHCPLease]:
    """Fetch IPv4 DHCP server leases via the VyOS GraphQL API.

    The ``origin`` argument is required by the schema but is honored on 1.4
    (filters local vs. remote) and ignored on 1.5 (returns the full set for
    either value). We therefore query both origins in a single request and
    dedupe by IP+MAC so the result is correct on both versions.
    """
    api_key = str(service.config.apikey)
    url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
    query = (
        "query ($key: String) {"
        "  local: ShowServerLeasesDhcp(data: {key: $key, family: inet, state: all, origin: local}) { success data { result } }"
        "  remote: ShowServerLeasesDhcp(data: {key: $key, family: inet, state: all, origin: remote}) { success data { result } }"
        "}"
    )
    payload = {"query": query, "variables": {"key": api_key}}

    async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
        resp = await client.post(url, json=payload, auth=("vyos", api_key))

    if resp.status_code != 200:
        raise RuntimeError(f"GraphQL HTTP {resp.status_code}")

    body = resp.json()
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")

    data = body.get("data") or {}
    deduped: Dict[tuple, DHCPLease] = {}
    for alias in ("local", "remote"):
        node = data.get(alias) or {}
        rows = (node.get("data") or {}).get("result")
        for lease in _parse_gql_lease_rows(rows):
            deduped.setdefault((lease.ip_address, lease.mac_address), lease)
    return list(deduped.values())


def _fetch_leases_rest(service) -> List[DHCPLease]:
    """Fallback: fetch leases via the REST 'show dhcp server leases' text output."""
    response = service.device.show(path=["dhcp", "server", "leases"])
    if response.status != 200 or not response.result:
        return []

    output = ""
    if isinstance(response.result, dict) and "data" in response.result:
        output = response.result["data"]
    elif isinstance(response.result, str):
        output = response.result
    if not output:
        return []

    leases: List[DHCPLease] = []
    lines = output.strip().split('\n')
    data_lines = [
        line for i, line in enumerate(lines)
        if i >= 2 and line.strip() and not line.startswith('-')
    ]
    for line in data_lines:
        parts = line.split()
        if len(parts) < 9:
            continue
        try:
            leases.append(DHCPLease(
                ip_address=parts[0],
                mac_address=parts[1],
                state=parts[2],
                lease_start=f"{parts[3]} {parts[4]}",
                lease_expiration=f"{parts[5]} {parts[6]}",
                remaining=parts[7],
                pool=parts[8],
                hostname=_normalize_hostname(parts[9]) if len(parts) > 9 else None,
                origin=parts[10] if len(parts) > 10 else "local",
            ))
        except (IndexError, ValueError) as e:
            logger.warning("Could not parse lease line %r: %s", line, e)
    return leases


@router.get("/leases", response_model=DHCPLeasesResponse)
async def get_dhcp_leases(request: Request):
    """
    Get all active DHCP leases from VyOS.

    Uses the GraphQL ``ShowServerLeasesDhcp`` op (faster than the REST text
    output and returns structured JSON). Falls back to parsing the REST
    'show dhcp server leases' output if the GraphQL request fails.

    Returns:
        List of DHCP leases with details like IP, MAC, hostname, expiration, etc.
    """
    # Check RBAC permission
    await require_read_permission(request, FeatureGroup.DHCP)

    try:
        service = get_session_vyos_service(request)

        try:
            leases = await _fetch_leases_graphql(service)
        except Exception as e:
            logger.warning("GraphQL lease fetch failed (%s); falling back to REST", e)
            leases = await run_in_threadpool(_fetch_leases_rest, service)

        return DHCPLeasesResponse(leases=leases, total=len(leases))

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/leases/clear", response_model=VyOSResponse)
async def clear_dhcp_lease(http_request: Request, request: DHCPClearLeaseRequest):
    """
    Clear (release) a single active DHCP lease.

    This is an operational command, not a configuration change, so it is issued
    via the VyOS GraphQL API rather than the batch/config endpoint. The mutation
    differs between VyOS versions:

    - 1.4: ``ClearReleaseLeaseDhcp(data: {key, ip_address})``
           (only active leases can be released)
    - 1.5: ``ClearDhcpServerLeaseDhcp(data: {key, family, address, vrf})``

    Args:
        request: The IP address of the lease to clear, plus optional VRF (1.5).

    Returns:
        Success status and any error reported by VyOS.
    """
    await require_write_permission(http_request, FeatureGroup.DHCP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Validate / normalize the IP address and derive the address family.
        try:
            ip_obj = ipaddress.ip_address(request.ip_address)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid IP address")
        family = "inet6" if ip_obj.version == 6 else "inet"
        ip_str = str(ip_obj)

        api_key = str(service.config.apikey)
        url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"

        if "1.4" in version:
            mutation_name = "ClearReleaseLeaseDhcp"
            query = (
                "mutation ($key: String, $ip: String!) {"
                f"  {mutation_name}(data: {{key: $key, ip_address: $ip}}) {{"
                "    success errors"
                "  }"
                "}"
            )
            variables = {"key": api_key, "ip": ip_str}
        else:
            mutation_name = "ClearDhcpServerLeaseDhcp"
            query = (
                "mutation ($key: String, $family: FamilyDhcp!, $address: String!, $vrf: String) {"
                f"  {mutation_name}(data: {{key: $key, family: $family, address: $address, vrf: $vrf}}) {{"
                "    success errors"
                "  }"
                "}"
            )
            variables = {
                "key": api_key,
                "family": family,
                "address": ip_str,
                "vrf": request.vrf,
            }

        payload = {"query": query, "variables": variables}

        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))

        if resp.status_code != 200:
            logger.error("Clear DHCP lease GraphQL HTTP error %d", resp.status_code)
            raise HTTPException(status_code=502, detail="Failed to clear DHCP lease")

        body = resp.json()
        if "errors" in body and body["errors"]:
            logger.warning("Clear DHCP lease GraphQL errors: %s", body["errors"])
            return VyOSResponse(success=False, error="Failed to clear DHCP lease")

        node = (body.get("data") or {}).get(mutation_name) or {}
        success = bool(node.get("success"))
        error = None
        if not success:
            errs = node.get("errors") or []
            error = "; ".join(str(e) for e in errs) if errs else "Failed to clear DHCP lease"

        return VyOSResponse(success=success, error=error)

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def dhcp_batch_configure(http_request: Request, request: DHCPBatchRequest):
    """
    Execute a batch of DHCP configuration operations.

    This endpoint allows multiple DHCP configuration changes to be applied
    in a single VyOS commit operation for efficiency.

    Args:
        request: Batch request containing network name, optional subnet, and operations list

    Returns:
        Success status and any relevant data
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.DHCP)

    try:
        # Get service and version
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Create builder
        builder = DHCPBatchBuilder(version=version)

        # Process each operation
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value

            # Dynamically call the method on the builder
            if not hasattr(builder, op_name):
                raise HTTPException(
                    status_code=400, detail=f"Unknown operation: {op_name}"
                )

            method = getattr(builder, op_name)

            # Use inspect to determine method signature
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments based on method signature
            args = []

            # Always include network_name if the method expects it
            if "network_name" in params:
                args.append(request.network_name)

            # Include subnet if the method expects it
            if "subnet" in params:
                if request.subnet is not None:
                    # Use subnet from request (for single-subnet operations)
                    args.append(request.subnet)
                elif op_value is not None:
                    # Use subnet from operation value (for multi-subnet operations)
                    args.append(op_value)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {op_name} requires a subnet",
                    )

            # Include value(s) if the method expects it
            if op_value is not None and len(params) > len(args):
                # Find the remaining parameters that need values
                remaining_params = [p for p in params if p not in ["network_name", "subnet"]]

                # If there are multiple remaining params and value contains pipe separator
                if len(remaining_params) > 1 and "|" in str(op_value):
                    # Split pipe-separated values
                    value_parts = str(op_value).split("|")
                    args.extend(value_parts[:len(remaining_params)])
                elif remaining_params:
                    # Single value parameter
                    args.append(op_value)

            # Call the method
            method(*args)

        # Check if batch has operations
        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        # Execute batch operations
        response = service.execute_batch(builder)

        # Get operation count from builder
        operation_count = len(builder.get_operations())

        # Handle empty string result (convert to None for Pydantic validation)
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "DHCP configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            # If it's not a dict and not empty, wrap it
            result_data = {"result": result_data, "message": "DHCP configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "DHCP configuration updated"
            result_data["operations_count"] = operation_count

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
