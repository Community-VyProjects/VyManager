"""
NTP Service Configuration Endpoints

All NTP service endpoints for VyOS configuration.
Supports NTP servers, clients, and time synchronization.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for NTP Service endpoints
router = APIRouter(prefix="/vyos/ntp", tags=["ntp-service"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class NTPBatchRequest(BaseModel):
    """Model for batch NTP configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of NTP operations",
        json_schema_extra={
            "example": [
                {"op": "add_server", "server": "pool.ntp.org", "pool": True},
                {"op": "add_listen_address", "address": "192.168.1.1"},
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


class NTPServer(BaseModel):
    """NTP server configuration."""
    address: str
    pool: bool = False
    prefer: bool = False
    noselect: bool = False
    nts: bool = False


class NTPConfigResponse(BaseModel):
    """Full NTP configuration response."""
    configured: bool
    servers: List[NTPServer] = Field(default_factory=list)
    listen_addresses: List[str] = Field(default_factory=list)
    allow_clients: List[str] = Field(default_factory=list)
    leap_second: Optional[str] = None
    vrf: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=NTPConfigResponse)
async def get_ntp_config(http_request: Request) -> NTPConfigResponse:
    """
    Get full NTP configuration from VyOS.

    Returns NTP servers, listen addresses, allowed clients, and settings.
    """
    await require_read_permission(http_request, FeatureGroup.NTP)

    from vyos_mappers.services.ntp import NTPMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = NTPMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return NTPConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ntp_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get NTP capabilities for the connected VyOS version.

    Returns leap second modes and server options.
    """
    await require_read_permission(http_request, FeatureGroup.NTP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Leap second modes
        leap_second_modes = [
            {"value": "ignore", "label": "Ignore", "description": "Ignore leap seconds"},
            {"value": "smear", "label": "Smear", "description": "Spread leap second over time"},
            {"value": "system", "label": "System", "description": "Apply leap second as kernel does"},
            {"value": "timezone", "label": "Timezone", "description": "Apply leap second from timezone file"},
        ]

        # Common NTP pools
        common_pools = [
            {"value": "pool.ntp.org", "label": "pool.ntp.org", "description": "Global NTP pool"},
            {"value": "0.pool.ntp.org", "label": "0.pool.ntp.org", "description": "Pool server 0"},
            {"value": "1.pool.ntp.org", "label": "1.pool.ntp.org", "description": "Pool server 1"},
            {"value": "2.pool.ntp.org", "label": "2.pool.ntp.org", "description": "Pool server 2"},
            {"value": "3.pool.ntp.org", "label": "3.pool.ntp.org", "description": "Pool server 3"},
            {"value": "time.google.com", "label": "time.google.com", "description": "Google NTP"},
            {"value": "time.cloudflare.com", "label": "time.cloudflare.com", "description": "Cloudflare NTP"},
            {"value": "time.apple.com", "label": "time.apple.com", "description": "Apple NTP"},
            {"value": "time.windows.com", "label": "time.windows.com", "description": "Microsoft NTP"},
        ]

        return {
            "leap_second_modes": leap_second_modes,
            "common_pools": common_pools,
            "server_flags": [
                {"value": "pool", "label": "Pool", "description": "Server is a pool (multiple IPs)"},
                {"value": "prefer", "label": "Prefer", "description": "Prefer this server"},
                {"value": "noselect", "label": "No Select", "description": "Don't use for time sync"},
                {"value": "nts", "label": "NTS", "description": "Use Network Time Security"},
            ],
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_ntp_status(http_request: Request) -> Dict[str, Any]:
    """
    Get NTP status and peers.
    """
    await require_read_permission(http_request, FeatureGroup.NTP)

    try:
        service = get_session_vyos_service(http_request)
        result = await run_in_threadpool(service.run_show_command, "show ntp")

        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_ntp_batch(http_request: Request, request: NTPBatchRequest) -> VyOSResponse:
    """
    Configure NTP using batch operations.

    **Server Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_server` | server, pool?, prefer?, noselect?, nts? | Add NTP server |
    | `delete_server` | server | Remove NTP server |
    | `set_server_pool` | server | Mark server as pool |
    | `unset_server_pool` | server | Unmark server as pool |
    | `set_server_prefer` | server | Set server as preferred |
    | `unset_server_prefer` | server | Unset preferred flag |
    | `set_server_noselect` | server | Set noselect flag |
    | `unset_server_noselect` | server | Unset noselect flag |
    | `set_server_nts` | server | Enable NTS for server |
    | `unset_server_nts` | server | Disable NTS for server |

    **Listen Address Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_listen_address` | address | Add listen address |
    | `delete_listen_address` | address | Remove listen address |

    **Client Access Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_allow_client` | network | Allow client network |
    | `delete_allow_client` | network | Remove client network |

    **Misc Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `set_leap_second` | mode | Set leap second mode |
    | `delete_leap_second` | - | Remove leap second config |
    | `set_vrf` | vrf | Set VRF |
    | `delete_vrf` | - | Remove VRF |
    """
    await require_write_permission(http_request, FeatureGroup.NTP)

    from vyos_mappers.services.ntp import NTPMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = NTPMapper(service.get_version())

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
            server = operation.get("server")
            address = operation.get("address")
            network = operation.get("network")
            mode = operation.get("mode")
            vrf = operation.get("vrf")

            # ================================================================
            # Server Operations
            # ================================================================

            if op_type == "add_server":
                if not server:
                    raise HTTPException(status_code=400, detail="add_server requires 'server'")
                set_commands.append(mapper.get_server(server))
                if operation.get("pool"):
                    set_commands.append(mapper.get_server_pool(server))
                if operation.get("prefer"):
                    set_commands.append(mapper.get_server_prefer(server))
                if operation.get("noselect"):
                    set_commands.append(mapper.get_server_noselect(server))
                if operation.get("nts"):
                    set_commands.append(mapper.get_server_nts(server))

            elif op_type == "delete_server":
                if not server:
                    raise HTTPException(status_code=400, detail="delete_server requires 'server'")
                delete_commands.append(mapper.get_server(server))

            elif op_type == "set_server_pool":
                if not server:
                    raise HTTPException(status_code=400, detail="set_server_pool requires 'server'")
                set_commands.append(mapper.get_server_pool(server))

            elif op_type == "unset_server_pool":
                if not server:
                    raise HTTPException(status_code=400, detail="unset_server_pool requires 'server'")
                delete_commands.append(mapper.get_server_pool(server))

            elif op_type == "set_server_prefer":
                if not server:
                    raise HTTPException(status_code=400, detail="set_server_prefer requires 'server'")
                set_commands.append(mapper.get_server_prefer(server))

            elif op_type == "unset_server_prefer":
                if not server:
                    raise HTTPException(status_code=400, detail="unset_server_prefer requires 'server'")
                delete_commands.append(mapper.get_server_prefer(server))

            elif op_type == "set_server_noselect":
                if not server:
                    raise HTTPException(status_code=400, detail="set_server_noselect requires 'server'")
                set_commands.append(mapper.get_server_noselect(server))

            elif op_type == "unset_server_noselect":
                if not server:
                    raise HTTPException(status_code=400, detail="unset_server_noselect requires 'server'")
                delete_commands.append(mapper.get_server_noselect(server))

            elif op_type == "set_server_nts":
                if not server:
                    raise HTTPException(status_code=400, detail="set_server_nts requires 'server'")
                set_commands.append(mapper.get_server_nts(server))

            elif op_type == "unset_server_nts":
                if not server:
                    raise HTTPException(status_code=400, detail="unset_server_nts requires 'server'")
                delete_commands.append(mapper.get_server_nts(server))

            # ================================================================
            # Listen Address Operations
            # ================================================================

            elif op_type == "add_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="add_listen_address requires 'address'")
                set_commands.append(mapper.get_listen_address(address))

            elif op_type == "delete_listen_address":
                if not address:
                    raise HTTPException(status_code=400, detail="delete_listen_address requires 'address'")
                delete_commands.append(mapper.get_listen_address(address))

            # ================================================================
            # Client Access Operations
            # ================================================================

            elif op_type == "add_allow_client":
                if not network:
                    raise HTTPException(status_code=400, detail="add_allow_client requires 'network'")
                set_commands.append(mapper.get_allow_client_address(network))

            elif op_type == "delete_allow_client":
                if not network:
                    raise HTTPException(status_code=400, detail="delete_allow_client requires 'network'")
                delete_commands.append(mapper.get_allow_client_address(network))

            # ================================================================
            # Misc Operations
            # ================================================================

            elif op_type == "set_leap_second":
                if not mode:
                    raise HTTPException(status_code=400, detail="set_leap_second requires 'mode'")
                set_commands.append(mapper.get_leap_second_mode(mode))

            elif op_type == "delete_leap_second":
                # Delete all possible leap second modes
                for m in ["ignore", "smear", "system", "timezone"]:
                    delete_commands.append(mapper.get_leap_second_mode(m))

            elif op_type == "set_vrf":
                if not vrf:
                    raise HTTPException(status_code=400, detail="set_vrf requires 'vrf'")
                set_commands.append(mapper.get_vrf(vrf))

            elif op_type == "delete_vrf":
                delete_commands.append(["service", "ntp", "vrf"])

            else:
                raise HTTPException(status_code=400, detail=f"Unsupported operation: {op_type}")

        # Execute commands
        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=delete_commands
        )

        return VyOSResponse(
            success=response.status == 200,
            data=response.result if hasattr(response, 'result') else None,
            error=response.error if hasattr(response, 'error') and response.error else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
