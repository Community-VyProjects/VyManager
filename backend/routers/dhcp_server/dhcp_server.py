"""
DHCP Server Router

API endpoints for managing VyOS DHCP server configuration.
Supports shared networks, subnets, ranges, static mappings, and options.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.dhcp_server import DHCPServerBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.dhcp_server import DHCPServerMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import inspect
import ipaddress
import httpx
from datetime import datetime, timezone
import logging
from batch_dispatch import resolve_batch_method


def split_packed_value(value: str, count: int) -> List[str]:
    """Split a pipe-packed batch value into `count` args.

    Extra segments stay on the last argument so a value that itself contains
    '|' is rejected by the mapper instead of being silently truncated.
    """
    parts = str(value).split("|")
    if count <= 1:
        return [str(value)]
    if len(parts) <= count:
        return parts
    return parts[: count - 1] + ["|".join(parts[count - 1 :])]


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcp-server", tags=["dhcp-server"])


# ============================================================================
# Request/Response Models
# ============================================================================


class DHCPRange(BaseModel):
    """DHCP range configuration."""

    range_id: str = Field(..., description="Range identifier (numeric)")
    start: Optional[str] = None
    stop: Optional[str] = None
    catalog: Dict[str, Any] = Field(default_factory=dict)


class DHCPStaticMapping(BaseModel):
    """DHCP static mapping configuration."""

    name: str = Field(..., description="Static mapping name")
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    duid: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    catalog: Dict[str, Any] = Field(default_factory=dict)


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
    catalog: Dict[str, Any] = Field(default_factory=dict)


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
    catalog: Dict[str, Any] = Field(default_factory=dict)


class DHCPFailoverConfig(BaseModel):
    """DHCP failover/high availability configuration."""

    mode: Optional[str] = None  # active-active or active-passive
    name: Optional[str] = None
    source_address: Optional[str] = None
    remote: Optional[str] = None
    status: Optional[str] = None  # primary or secondary
    certificate: Optional[str] = None
    ca_certificate: Optional[str] = None


class DHCPDdnsDnsServer(BaseModel):
    id: str
    address: Optional[str] = None
    port: Optional[str] = None


class DHCPDdnsDomain(BaseModel):
    name: str
    key_name: Optional[str] = None
    dns_servers: List[DHCPDdnsDnsServer] = []


class DHCPDdnsTsigKey(BaseModel):
    name: str
    algorithm: Optional[str] = None
    secret: Optional[str] = None


class DHCPDdnsConfig(BaseModel):
    present: bool = False
    send_updates: Optional[str] = None
    conflict_resolution: Optional[str] = None
    override_client_update: Optional[str] = None
    override_no_update: Optional[str] = None
    update_on_renew: Optional[str] = None
    replace_client_name: Optional[str] = None
    ttl_percent: Optional[str] = None
    generated_prefix: Optional[str] = None
    qualifying_suffix: Optional[str] = None
    hostname_char_replacement: Optional[str] = None
    hostname_char_set: Optional[str] = None
    tsig_keys: List[DHCPDdnsTsigKey] = []
    forward_domains: List[DHCPDdnsDomain] = []
    reverse_domains: List[DHCPDdnsDomain] = []


class DHCPGlobalConfig(BaseModel):
    """DHCP global configuration."""

    listen_addresses: List[str] = []
    listen_interfaces: List[str] = []
    hostfile_update: bool = False
    host_decl_name: bool = False
    disable: bool = False
    catalog: Dict[str, Any] = Field(default_factory=dict)


class DHCPClientClass(BaseModel):
    name: str
    disable: bool = False
    circuit_id: Optional[str] = None
    remote_id: Optional[str] = None


class DHCPConfigResponse(BaseModel):
    """Response containing all DHCP configurations."""

    shared_networks: List[DHCPSharedNetwork] = []
    failover: Optional[DHCPFailoverConfig] = None
    ddns: DHCPDdnsConfig = DHCPDdnsConfig()
    global_config: DHCPGlobalConfig = DHCPGlobalConfig()
    client_classes: List[DHCPClientClass] = []
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
        builder = DHCPServerBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
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
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            DHCPServerMapper,
            CommandMapperRegistry.get_mapper("dhcp_server", service.get_version()),
        )
        return DHCPConfigResponse(**mapper.parse_config(full_config))

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
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
    except Exception:
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
        mapper = cast(
            DHCPServerMapper,
            CommandMapperRegistry.get_mapper("dhcp_server", service.get_version()),
        )

        # Validate / normalize the IP address and derive the address family.
        try:
            ip_obj = ipaddress.ip_address(request.ip_address)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid IP address")
        family = "inet6" if ip_obj.version == 6 else "inet"

        api_key = str(service.config.apikey)
        url = f"{service.config.protocol}://{service.config.hostname}:{service.config.port}/graphql"
        query, variables = mapper.lease_clear_request(str(ip_obj), family, request.vrf)
        payload = {"query": query, "variables": {"key": api_key, **variables}}

        async with httpx.AsyncClient(verify=service.config.verify, timeout=15.0) as client:
            resp = await client.post(url, json=payload, auth=("vyos", api_key))

        if resp.status_code != 200:
            logger.error("Clear DHCP lease GraphQL HTTP error %d", resp.status_code)
            raise HTTPException(status_code=502, detail="Failed to clear DHCP lease")

        body = resp.json()
        if "errors" in body and body["errors"]:
            logger.warning("Clear DHCP lease GraphQL errors: %s", body["errors"])
            return VyOSResponse(success=False, error="Failed to clear DHCP lease")

        node = (body.get("data") or {}).get(mapper.LEASE_CLEAR_MUTATION) or {}
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
        service = get_session_vyos_service(http_request)
        builder = DHCPServerBatchBuilder(version=service.get_version())

        try:
            for operation in request.operations:
                op_name = operation.op
                op_value = operation.value
                method = resolve_batch_method(builder, op_name)
                params = list(inspect.signature(method).parameters.keys())
                args: List[str] = []

                if "network_name" in params:
                    args.append(request.network_name)

                remaining = [p for p in params if p not in ("network_name", "subnet")]
                if "subnet" in params:
                    if request.subnet:
                        args.append(request.subnet)
                    elif op_value and not remaining:
                        args.append(op_value)
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires a subnet",
                        )

                if remaining:
                    if not op_value:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires a value",
                        )
                    values = split_packed_value(op_value, len(remaining))
                    if len(values) != len(remaining) or not all(values):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires {len(remaining)} values",
                        )
                    args.extend(values)

                method(*args)
        except (ValueError, TypeError) as e:
            raise HTTPException(status_code=400, detail=str(e))

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)
        operation_count = len(builder.get_operations())

        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "DHCP configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
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
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
