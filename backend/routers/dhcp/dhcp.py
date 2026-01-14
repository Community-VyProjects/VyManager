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
import inspect

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
    disable: bool = False


class DHCPSubnet(BaseModel):
    """DHCP subnet configuration."""

    subnet: str = Field(..., description="Subnet CIDR (e.g., 192.168.1.0/24)")
    subnet_id: Optional[int] = Field(
        None, description="Subnet ID (required in VyOS 1.5)"
    )
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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=DHCPConfigResponse)
async def get_dhcp_config(http_request: Request, refresh: bool = False):
    """
    Get all DHCP server configurations from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all DHCP shared networks, subnets, and options
    """
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
                # Parse network-level name-servers
                network_name_servers = []
                if "name-server" in network_data:
                    ns_data = network_data["name-server"]
                    if isinstance(ns_data, dict):
                        network_name_servers = list(ns_data.keys())
                    elif isinstance(ns_data, list):
                        network_name_servers = ns_data
                    elif isinstance(ns_data, str):
                        network_name_servers = [ns_data]

                # Parse network-level domain-search
                network_domain_search = []
                if "domain-search" in network_data:
                    ds_data = network_data["domain-search"]
                    if isinstance(ds_data, dict):
                        network_domain_search = list(ds_data.keys())
                    elif isinstance(ds_data, list):
                        network_domain_search = ds_data
                    elif isinstance(ds_data, str):
                        network_domain_search = [ds_data]

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
                                static_mappings.append(
                                    DHCPStaticMapping(
                                        name=mapping_name,
                                        ip_address=mapping_data.get("ip-address"),
                                        mac_address=mapping_data.get("mac-address"),
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

                        subnet = DHCPSubnet(
                            subnet=subnet_cidr,
                            subnet_id=subnet_data.get("subnet-id"),
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
                            client_prefix_length=subnet_data.get("client-prefix-length"),
                            wpad_url=subnet_data.get("wpad-url"),
                        )
                        subnets.append(subnet)

                network = DHCPSharedNetwork(
                    name=network_name,
                    authoritative="authoritative" in network_data,
                    name_servers=network_name_servers,
                    domain_name=network_data.get("domain-name"),
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
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leases", response_model=DHCPLeasesResponse)
async def get_dhcp_leases(request: Request):
    """
    Get all active DHCP leases from VyOS.

    Uses the 'show dhcp server leases' command via the VyOS API.
    Results are cached to improve performance and reduce API calls.

    Returns:
        List of active DHCP leases with details like IP, MAC, hostname, expiration, etc.
    """
    import re

    try:
        service = get_session_vyos_service(request)

        # Use the show command to get DHCP leases
        # This returns tabular data that we need to parse
        response = service.device.show(path=["dhcp", "server", "leases"])

        if response.status != 200 or not response.result:
            return DHCPLeasesResponse(leases=[], total=0)

        # Parse the output - it comes as a string table
        output = response.result
        if not output:
            return DHCPLeasesResponse(leases=[], total=0)

        leases = []
        lines = output.strip().split('\n')

        # Find header line to determine column positions
        header_idx = -1
        separator_idx = -1
        for i, line in enumerate(lines):
            if 'IP Address' in line or 'IP address' in line:
                header_idx = i
            elif line.strip().startswith('-') and header_idx >= 0:
                separator_idx = i
                break

        # Skip to data lines
        start_idx = separator_idx + 1 if separator_idx >= 0 else 2
        data_lines = [line for line in lines[start_idx:] if line.strip() and not line.startswith('-')]

        # Parse each lease line using regex for more robust parsing
        # VyOS lease format: IP MAC State Start End Remaining Pool [Hostname] [Origin]
        # Example: 192.168.1.100    aa:bb:cc:dd:ee:ff    active    2024/01/01 10:00:00    2024/01/01 12:00:00    01:59:30    LAN    myhost    local
        ip_pattern = re.compile(r'^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')
        mac_pattern = re.compile(r'([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})')
        datetime_pattern = re.compile(r'(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})')
        time_pattern = re.compile(r'(\d{1,2}:\d{2}:\d{2})')

        for line in data_lines:
            try:
                # Extract IP address
                ip_match = ip_pattern.search(line)
                if not ip_match:
                    continue
                ip_address = ip_match.group(1)

                # Extract MAC address
                mac_match = mac_pattern.search(line)
                mac_address = mac_match.group(1) if mac_match else "unknown"

                # Find all datetime matches
                datetime_matches = datetime_pattern.findall(line)
                lease_start = datetime_matches[0] if len(datetime_matches) > 0 else "unknown"
                lease_expiration = datetime_matches[1] if len(datetime_matches) > 1 else "unknown"

                # Extract state (active, expired, free, etc.)
                state = "unknown"
                state_patterns = ["active", "expired", "free", "released", "abandoned", "backup"]
                for s in state_patterns:
                    if s in line.lower():
                        state = s
                        break

                # Try to extract remaining time - look for pattern like HH:MM:SS after expiration
                remaining = "unknown"
                # Split line and find time-like pattern that's not part of datetime
                parts = line.split()
                for i, part in enumerate(parts):
                    # Skip parts that are part of datetime (contain /)
                    if '/' in part:
                        continue
                    # Look for time pattern HH:MM:SS or H:MM:SS
                    if re.match(r'^\d{1,2}:\d{2}:\d{2}$', part):
                        # Make sure it's not the time part of a datetime
                        if i > 0 and '/' not in parts[i-1]:
                            remaining = part
                            break

                # Extract pool name - usually after remaining time
                pool = "default"
                # Look for common pool indicators
                for part in parts:
                    if part not in [ip_address, mac_address, state] and \
                       not re.match(r'^\d{4}/\d{2}/\d{2}$', part) and \
                       not re.match(r'^\d{1,2}:\d{2}:\d{2}$', part) and \
                       len(part) > 2 and not part.startswith('-'):
                        # Could be pool name or hostname
                        if pool == "default":
                            pool = part
                        break

                # Hostname is typically near the end
                hostname = None
                origin = "local"

                # Look for origin indicators
                if "local" in line.lower():
                    origin = "local"
                elif "remote" in line.lower():
                    origin = "remote"

                lease = DHCPLease(
                    ip_address=ip_address,
                    mac_address=mac_address,
                    state=state,
                    lease_start=lease_start,
                    lease_expiration=lease_expiration,
                    remaining=remaining,
                    pool=pool,
                    hostname=hostname,
                    origin=origin
                )
                leases.append(lease)
            except Exception as e:
                # Skip malformed lines but log for debugging
                print(f"Warning: Could not parse lease line: {line}. Error: {e}")
                continue

        return DHCPLeasesResponse(leases=leases, total=len(leases))

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))
