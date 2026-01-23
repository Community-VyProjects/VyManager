"""
VRRP/High Availability Configuration Endpoints

All VRRP and HA endpoints for VyOS configuration.
Supports VRRP groups, sync groups, virtual servers, and global parameters.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for VRRP/HA endpoints
router = APIRouter(prefix="/vyos/ha", tags=["high-availability"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class VRRPBatchRequest(BaseModel):
    """Model for batch VRRP configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of VRRP operations",
        json_schema_extra={
            "example": [
                {"op": "create_vrrp_group", "name": "WAN"},
                {"op": "set_vrrp_group_vrid", "name": "WAN", "value": "10"},
                {"op": "set_vrrp_group_interface", "name": "WAN", "value": "eth0"},
                {"op": "add_vrrp_group_address", "name": "WAN", "value": "192.168.1.1/24"},
            ]
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models (for READ operations)
# ============================================================================


class VRRPTrack(BaseModel):
    """VRRP interface tracking configuration."""
    interfaces: List[str] = Field(default_factory=list)
    exclude_vrrp_interface: bool = False


class VRRPHealthCheck(BaseModel):
    """VRRP health check configuration."""
    script: Optional[str] = None
    interval: Optional[str] = None
    failure_count: Optional[str] = None


class VRRPTransitionScripts(BaseModel):
    """VRRP transition scripts configuration."""
    master: Optional[str] = None
    backup: Optional[str] = None
    fault: Optional[str] = None
    stop: Optional[str] = None


class VRRPAuthentication(BaseModel):
    """VRRP authentication configuration."""
    type: Optional[str] = None
    password: Optional[str] = None


class VRRPGroup(BaseModel):
    """VRRP group configuration."""
    name: str
    vrid: Optional[str] = None
    interface: Optional[str] = None
    addresses: List[str] = Field(default_factory=list)
    excluded_addresses: List[str] = Field(default_factory=list)
    priority: str = "100"
    disable: bool = False
    no_preempt: bool = False
    preempt_delay: Optional[str] = None
    rfc3768_compatibility: bool = False
    description: Optional[str] = None
    hello_source_address: Optional[str] = None
    peer_addresses: List[str] = Field(default_factory=list)
    track: Optional[VRRPTrack] = None
    health_check: Optional[VRRPHealthCheck] = None
    transition_scripts: Optional[VRRPTransitionScripts] = None
    authentication: Optional[VRRPAuthentication] = None


class SyncGroupTransitionScripts(BaseModel):
    """Sync group transition scripts."""
    master: Optional[str] = None
    backup: Optional[str] = None
    fault: Optional[str] = None


class VRRPSyncGroup(BaseModel):
    """VRRP sync group configuration."""
    name: str
    members: List[str] = Field(default_factory=list)
    transition_scripts: Optional[SyncGroupTransitionScripts] = None


class VRRPGarp(BaseModel):
    """VRRP GARP (Gratuitous ARP) settings."""
    interval: Optional[str] = None
    master_delay: Optional[str] = None
    master_refresh: Optional[str] = None
    master_refresh_repeat: Optional[str] = None
    master_repeat: Optional[str] = None


class VRRPGlobalParameters(BaseModel):
    """VRRP global parameters."""
    startup_delay: Optional[str] = None
    version: Optional[str] = None
    garp: Optional[VRRPGarp] = None


class VirtualServerRealServer(BaseModel):
    """Virtual server real server configuration."""
    address: str
    port: Optional[str] = None


class VirtualServer(BaseModel):
    """Virtual server configuration."""
    address: str
    algorithm: Optional[str] = None
    forward_method: Optional[str] = None
    port: Optional[str] = None
    protocol: Optional[str] = None
    fwmark: Optional[str] = None
    delay_loop: Optional[str] = None
    persistence_timeout: Optional[str] = None
    real_servers: List[VirtualServerRealServer] = Field(default_factory=list)


class VRRPConfigResponse(BaseModel):
    """Full VRRP/HA configuration response."""
    configured: bool
    groups: List[VRRPGroup] = Field(default_factory=list)
    sync_groups: List[VRRPSyncGroup] = Field(default_factory=list)
    global_parameters: Optional[VRRPGlobalParameters] = None
    virtual_servers: List[VirtualServer] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class VRRPStatusGroup(BaseModel):
    """VRRP group runtime status."""
    name: str
    interface: Optional[str] = None
    vrid: Optional[str] = None
    state: str  # MASTER, BACKUP, FAULT, INIT
    priority: Optional[str] = None
    effective_priority: Optional[str] = None
    virtual_address: Optional[str] = None
    master_ip: Optional[str] = None
    advertisement_interval: Optional[str] = None
    last_transition: Optional[str] = None


class VRRPStatusResponse(BaseModel):
    """VRRP status response."""
    success: bool
    groups: List[VRRPStatusGroup] = Field(default_factory=list)
    error: Optional[str] = None


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=VRRPConfigResponse)
async def get_vrrp_config(http_request: Request) -> VRRPConfigResponse:
    """
    Get full VRRP/HA configuration from VyOS.

    Returns VRRP groups, sync groups, global parameters, and virtual servers.
    """
    await require_read_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)

    from vyos_mappers.ha.vrrp import VRRPMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = VRRPMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return VRRPConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_vrrp_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get VRRP capabilities for the connected VyOS version.

    Returns supported authentication types, algorithms, protocols, etc.
    """
    await require_read_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "authentication_types": [
                {"value": "plaintext-password", "label": "Plaintext Password", "description": "Simple text password"},
                {"value": "ah", "label": "AH (Authentication Header)", "description": "IPSEC AH authentication"},
            ],
            "vrrp_versions": [
                {"value": "2", "label": "VRRP v2", "description": "RFC 3768 - IPv4 only"},
                {"value": "3", "label": "VRRP v3", "description": "RFC 5798 - IPv4 and IPv6"},
            ],
            "vs_algorithms": [
                {"value": "rr", "label": "Round Robin", "description": "Distribute connections equally"},
                {"value": "wrr", "label": "Weighted Round Robin", "description": "Weighted distribution"},
                {"value": "lc", "label": "Least Connection", "description": "Fewest active connections"},
                {"value": "wlc", "label": "Weighted Least Connection", "description": "Weighted least connection"},
                {"value": "sh", "label": "Source Hashing", "description": "Hash source IP"},
                {"value": "dh", "label": "Destination Hashing", "description": "Hash destination IP"},
                {"value": "lblc", "label": "Locality-Based Least Connection", "description": "Locality-based with least connection"},
                {"value": "lblcr", "label": "Locality-Based Least Connection with Replication", "description": "LBLC with replication"},
                {"value": "sed", "label": "Shortest Expected Delay", "description": "Based on expected delay"},
                {"value": "nq", "label": "Never Queue", "description": "Send to server with no queue"},
            ],
            "vs_forward_methods": [
                {"value": "direct", "label": "Direct Routing", "description": "Direct server return"},
                {"value": "nat", "label": "NAT", "description": "Network Address Translation"},
                {"value": "tunnel", "label": "IP Tunneling", "description": "IPIP encapsulation"},
            ],
            "vs_protocols": [
                {"value": "tcp", "label": "TCP", "description": "Transmission Control Protocol"},
                {"value": "udp", "label": "UDP", "description": "User Datagram Protocol"},
            ],
            "priority_range": {"min": 1, "max": 255, "default": 100},
            "vrid_range": {"min": 1, "max": 255},
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_vrrp_status(http_request: Request) -> VRRPStatusResponse:
    """
    Get VRRP runtime status from VyOS.

    Returns the current state of all VRRP groups (MASTER, BACKUP, FAULT, etc.).
    """
    await require_read_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)

    try:
        service = get_session_vyos_service(http_request)

        # Execute 'show vrrp' command
        result = await run_in_threadpool(service.execute_op_command, "show vrrp")

        groups = []

        if result.get("success") and result.get("data"):
            # Parse the VRRP status output
            # VyOS returns JSON with group information
            data = result.get("data", {})

            if isinstance(data, dict):
                for group_name, group_data in data.items():
                    if isinstance(group_data, dict):
                        groups.append(VRRPStatusGroup(
                            name=group_name,
                            interface=group_data.get("interface"),
                            vrid=str(group_data.get("vrid", "")),
                            state=group_data.get("state", "UNKNOWN"),
                            priority=str(group_data.get("priority", "")),
                            effective_priority=str(group_data.get("effective_priority", "")),
                            virtual_address=group_data.get("virtual_address"),
                            master_ip=group_data.get("master_ip"),
                            advertisement_interval=str(group_data.get("advert_interval", "")),
                            last_transition=group_data.get("last_transition"),
                        ))

        return VRRPStatusResponse(success=True, groups=groups)

    except Exception as e:
        return VRRPStatusResponse(success=False, groups=[], error=str(e))


@router.get("/virtual-server/status")
async def get_virtual_server_status(http_request: Request) -> Dict[str, Any]:
    """
    Get virtual server (load balancer) status from VyOS.

    Returns the current state of all virtual servers and their real servers.
    """
    await require_read_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)

    try:
        service = get_session_vyos_service(http_request)

        # Execute 'show virtual-server' command
        result = await run_in_threadpool(service.execute_op_command, "show virtual-server")

        return {
            "success": True,
            "data": result.get("data", {}),
        }

    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def configure_vrrp_batch(
    request: VRRPBatchRequest,
    http_request: Request,
) -> VyOSResponse:
    """
    Configure VRRP using batch operations.

    Supports operations for VRRP groups, sync groups, virtual servers, and global parameters.

    **VRRP Group Operations:**
    - create_vrrp_group, delete_vrrp_group
    - set_vrrp_group_vrid, set_vrrp_group_interface
    - add_vrrp_group_address, delete_vrrp_group_address
    - set_vrrp_group_priority, set_vrrp_group_description
    - enable_vrrp_group, disable_vrrp_group
    - set_vrrp_group_preempt_delay, enable_vrrp_group_no_preempt, disable_vrrp_group_no_preempt
    - enable_vrrp_group_rfc3768, disable_vrrp_group_rfc3768
    - add_vrrp_group_excluded_address, delete_vrrp_group_excluded_address
    - set_vrrp_group_peer_address, delete_vrrp_group_peer_address
    - set_vrrp_group_hello_source_address, delete_vrrp_group_hello_source_address
    - add_vrrp_group_track_interface, delete_vrrp_group_track_interface
    - set_vrrp_group_health_check_script, delete_vrrp_group_health_check
    - set_vrrp_group_health_check_interval, set_vrrp_group_health_check_failure_count
    - set_vrrp_group_transition_script_master/backup/fault/stop
    - set_vrrp_group_authentication

    **Sync Group Operations:**
    - create_sync_group, delete_sync_group
    - add_sync_group_member, delete_sync_group_member
    - set_sync_group_transition_script_master/backup/fault

    **Global Parameters Operations:**
    - set_global_startup_delay, delete_global_startup_delay
    - set_global_version, delete_global_version
    - set_global_garp_interval, etc.

    **Virtual Server Operations:**
    - create_virtual_server, delete_virtual_server
    - set_vs_algorithm, set_vs_forward_method, set_vs_port, set_vs_protocol
    - add_vs_real_server, delete_vs_real_server
    - set_vs_fwmark, set_vs_delay_loop, set_vs_persistence_timeout
    """
    await require_write_permission(http_request, FeatureGroup.HIGH_AVAILABILITY)

    from vyos_mappers.ha.vrrp import VRRPMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = VRRPMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Extract common parameters
            name = operation.get("name")
            value = operation.get("value")
            address = operation.get("address")
            interface = operation.get("interface")
            member = operation.get("member")
            script = operation.get("script")

            # ================================================================
            # VRRP Group Operations
            # ================================================================

            if op_type == "create_vrrp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="create_vrrp_group requires 'name'")
                set_commands.append(mapper.get_vrrp_group(name))

            elif op_type == "delete_vrrp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group requires 'name'")
                delete_commands.append(mapper.get_vrrp_group(name))

            elif op_type == "set_vrrp_group_vrid":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_vrid requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_vrid(name, str(value)))

            elif op_type == "set_vrrp_group_interface":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_interface requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_interface(name, value))

            elif op_type == "add_vrrp_group_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="add_vrrp_group_address requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_address(name, value))

            elif op_type == "delete_vrrp_group_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_address requires 'name' and 'value'")
                delete_commands.append(mapper.get_vrrp_group_address(name, value))

            elif op_type == "set_vrrp_group_priority":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_priority requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_priority(name, str(value)))

            elif op_type == "set_vrrp_group_description":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_description requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_description(name, value))

            elif op_type == "delete_vrrp_group_description":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_description requires 'name'")
                delete_commands.append(mapper.get_vrrp_group_description_path(name))

            elif op_type == "disable_vrrp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_vrrp_group requires 'name'")
                set_commands.append(mapper.get_vrrp_group_disable(name))

            elif op_type == "enable_vrrp_group":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrrp_group requires 'name'")
                delete_commands.append(mapper.get_vrrp_group_disable(name))

            elif op_type == "enable_vrrp_group_no_preempt":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrrp_group_no_preempt requires 'name'")
                set_commands.append(mapper.get_vrrp_group_no_preempt(name))

            elif op_type == "disable_vrrp_group_no_preempt":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_vrrp_group_no_preempt requires 'name'")
                delete_commands.append(mapper.get_vrrp_group_no_preempt(name))

            elif op_type == "set_vrrp_group_preempt_delay":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_preempt_delay requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_preempt_delay(name, str(value)))

            elif op_type == "delete_vrrp_group_preempt_delay":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_preempt_delay requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "group", name, "preempt-delay"])

            elif op_type == "enable_vrrp_group_rfc3768":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrrp_group_rfc3768 requires 'name'")
                set_commands.append(mapper.get_vrrp_group_rfc3768_compatibility(name))

            elif op_type == "disable_vrrp_group_rfc3768":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_vrrp_group_rfc3768 requires 'name'")
                delete_commands.append(mapper.get_vrrp_group_rfc3768_compatibility(name))

            # Excluded addresses
            elif op_type == "add_vrrp_group_excluded_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="add_vrrp_group_excluded_address requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_excluded_address(name, value))

            elif op_type == "delete_vrrp_group_excluded_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_excluded_address requires 'name' and 'value'")
                delete_commands.append(mapper.get_vrrp_group_excluded_address(name, value))

            # Unicast configuration
            elif op_type == "set_vrrp_group_peer_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_peer_address requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_peer_address(name, value))

            elif op_type == "delete_vrrp_group_peer_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_peer_address requires 'name' and 'value'")
                delete_commands.append(mapper.get_vrrp_group_peer_address(name, value))

            elif op_type == "set_vrrp_group_hello_source_address":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_hello_source_address requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_hello_source_address(name, value))

            elif op_type == "delete_vrrp_group_hello_source_address":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_hello_source_address requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "group", name, "hello-source-address"])

            # Tracking
            elif op_type == "add_vrrp_group_track_interface":
                if not name or not interface:
                    raise HTTPException(status_code=400, detail="add_vrrp_group_track_interface requires 'name' and 'interface'")
                set_commands.append(mapper.get_vrrp_group_track_interface(name, interface))

            elif op_type == "delete_vrrp_group_track_interface":
                if not name or not interface:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_track_interface requires 'name' and 'interface'")
                delete_commands.append(mapper.get_vrrp_group_track_interface(name, interface))

            elif op_type == "enable_vrrp_group_track_exclude_vrrp_interface":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrrp_group_track_exclude_vrrp_interface requires 'name'")
                set_commands.append(mapper.get_vrrp_group_track_exclude_vrrp_interface(name))

            elif op_type == "disable_vrrp_group_track_exclude_vrrp_interface":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_vrrp_group_track_exclude_vrrp_interface requires 'name'")
                delete_commands.append(mapper.get_vrrp_group_track_exclude_vrrp_interface(name))

            # Health check
            elif op_type == "set_vrrp_group_health_check_script":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_health_check_script requires 'name' and 'script'")
                set_commands.append(mapper.get_vrrp_group_health_check_script(name, script))

            elif op_type == "set_vrrp_group_health_check_interval":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_health_check_interval requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_health_check_interval(name, str(value)))

            elif op_type == "set_vrrp_group_health_check_failure_count":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_health_check_failure_count requires 'name' and 'value'")
                set_commands.append(mapper.get_vrrp_group_health_check_failure_count(name, str(value)))

            elif op_type == "delete_vrrp_group_health_check":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_health_check requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "group", name, "health-check"])

            # Transition scripts
            elif op_type == "set_vrrp_group_transition_script_master":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_transition_script_master requires 'name' and 'script'")
                set_commands.append(mapper.get_vrrp_group_transition_script_master(name, script))

            elif op_type == "set_vrrp_group_transition_script_backup":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_transition_script_backup requires 'name' and 'script'")
                set_commands.append(mapper.get_vrrp_group_transition_script_backup(name, script))

            elif op_type == "set_vrrp_group_transition_script_fault":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_transition_script_fault requires 'name' and 'script'")
                set_commands.append(mapper.get_vrrp_group_transition_script_fault(name, script))

            elif op_type == "set_vrrp_group_transition_script_stop":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_transition_script_stop requires 'name' and 'script'")
                set_commands.append(mapper.get_vrrp_group_transition_script_stop(name, script))

            elif op_type == "delete_vrrp_group_transition_scripts":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_transition_scripts requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "group", name, "transition-script"])

            # Authentication
            elif op_type == "set_vrrp_group_authentication":
                if not name:
                    raise HTTPException(status_code=400, detail="set_vrrp_group_authentication requires 'name'")
                auth_type = operation.get("auth_type")
                password = operation.get("password")
                if auth_type:
                    set_commands.append(mapper.get_vrrp_group_authentication_type(name, auth_type))
                if password:
                    set_commands.append(mapper.get_vrrp_group_authentication_password(name, password))

            elif op_type == "delete_vrrp_group_authentication":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrrp_group_authentication requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "group", name, "authentication"])

            # ================================================================
            # Sync Group Operations
            # ================================================================

            elif op_type == "create_sync_group":
                if not name:
                    raise HTTPException(status_code=400, detail="create_sync_group requires 'name'")
                set_commands.append(mapper.get_sync_group(name))

            elif op_type == "delete_sync_group":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_sync_group requires 'name'")
                delete_commands.append(mapper.get_sync_group(name))

            elif op_type == "add_sync_group_member":
                if not name or not member:
                    raise HTTPException(status_code=400, detail="add_sync_group_member requires 'name' and 'member'")
                set_commands.append(mapper.get_sync_group_member(name, member))

            elif op_type == "delete_sync_group_member":
                if not name or not member:
                    raise HTTPException(status_code=400, detail="delete_sync_group_member requires 'name' and 'member'")
                delete_commands.append(mapper.get_sync_group_member(name, member))

            elif op_type == "set_sync_group_transition_script_master":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_sync_group_transition_script_master requires 'name' and 'script'")
                set_commands.append(mapper.get_sync_group_transition_script_master(name, script))

            elif op_type == "set_sync_group_transition_script_backup":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_sync_group_transition_script_backup requires 'name' and 'script'")
                set_commands.append(mapper.get_sync_group_transition_script_backup(name, script))

            elif op_type == "set_sync_group_transition_script_fault":
                if not name or not script:
                    raise HTTPException(status_code=400, detail="set_sync_group_transition_script_fault requires 'name' and 'script'")
                set_commands.append(mapper.get_sync_group_transition_script_fault(name, script))

            elif op_type == "delete_sync_group_transition_scripts":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_sync_group_transition_scripts requires 'name'")
                delete_commands.append(["high-availability", "vrrp", "sync-group", name, "transition-script"])

            # ================================================================
            # Global Parameters Operations
            # ================================================================

            elif op_type == "set_global_startup_delay":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_startup_delay requires 'value'")
                set_commands.append(mapper.get_global_startup_delay(str(value)))

            elif op_type == "delete_global_startup_delay":
                delete_commands.append(["high-availability", "vrrp", "global-parameters", "startup-delay"])

            elif op_type == "set_global_version":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_version requires 'value'")
                set_commands.append(mapper.get_global_version(str(value)))

            elif op_type == "delete_global_version":
                delete_commands.append(["high-availability", "vrrp", "global-parameters", "version"])

            elif op_type == "set_global_garp_interval":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_garp_interval requires 'value'")
                set_commands.append(mapper.get_global_garp_interval(str(value)))

            elif op_type == "set_global_garp_master_delay":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_garp_master_delay requires 'value'")
                set_commands.append(mapper.get_global_garp_master_delay(str(value)))

            elif op_type == "set_global_garp_master_refresh":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_garp_master_refresh requires 'value'")
                set_commands.append(mapper.get_global_garp_master_refresh(str(value)))

            elif op_type == "set_global_garp_master_refresh_repeat":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_garp_master_refresh_repeat requires 'value'")
                set_commands.append(mapper.get_global_garp_master_refresh_repeat(str(value)))

            elif op_type == "set_global_garp_master_repeat":
                if not value:
                    raise HTTPException(status_code=400, detail="set_global_garp_master_repeat requires 'value'")
                set_commands.append(mapper.get_global_garp_master_repeat(str(value)))

            elif op_type == "delete_global_garp":
                delete_commands.append(["high-availability", "vrrp", "global-parameters", "garp"])

            # ================================================================
            # Virtual Server Operations
            # ================================================================

            elif op_type == "create_virtual_server":
                if not address:
                    raise HTTPException(status_code=400, detail="create_virtual_server requires 'address'")
                set_commands.append(mapper.get_virtual_server(address))

            elif op_type == "delete_virtual_server":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_virtual_server requires 'address'")
                delete_commands.append(mapper.get_virtual_server(address))

            elif op_type == "set_vs_algorithm":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_algorithm requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_algorithm(address, value))

            elif op_type == "set_vs_forward_method":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_forward_method requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_forward_method(address, value))

            elif op_type == "set_vs_port":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_port requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_port(address, str(value)))

            elif op_type == "set_vs_protocol":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_protocol requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_protocol(address, value))

            elif op_type == "set_vs_fwmark":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_fwmark requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_fwmark(address, str(value)))

            elif op_type == "set_vs_delay_loop":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_delay_loop requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_delay_loop(address, str(value)))

            elif op_type == "set_vs_persistence_timeout":
                if not address or not value:
                    raise HTTPException(status_code=400, detail="set_vs_persistence_timeout requires 'address' and 'value'")
                set_commands.append(mapper.get_virtual_server_persistence_timeout(address, str(value)))

            elif op_type == "add_vs_real_server":
                if not address:
                    raise HTTPException(status_code=400, detail="add_vs_real_server requires 'address'")
                real_server = operation.get("real_server")
                if not real_server:
                    raise HTTPException(status_code=400, detail="add_vs_real_server requires 'real_server'")
                set_commands.append(mapper.get_virtual_server_real_server(address, real_server))
                port = operation.get("port")
                if port:
                    set_commands.append(mapper.get_virtual_server_real_server_port(address, real_server, str(port)))

            elif op_type == "delete_vs_real_server":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_vs_real_server requires 'address'")
                real_server = operation.get("real_server")
                if not real_server:
                    raise HTTPException(status_code=400, detail="delete_vs_real_server requires 'real_server'")
                delete_commands.append(mapper.get_virtual_server_real_server(address, real_server))

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {op_type}"
                )

        # Execute delete commands first, then set commands
        result = await run_in_threadpool(
            service.batch_configure,
            set_paths=set_commands,
            delete_paths=delete_commands,
        )

        if not result.get("success", False):
            return VyOSResponse(
                success=False,
                error=result.get("error", "Unknown error during configuration")
            )

        return VyOSResponse(success=True, data=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
