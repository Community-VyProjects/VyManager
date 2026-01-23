"""
DHCP Relay Service Configuration Endpoints

All DHCP relay endpoints for VyOS configuration.
Supports both DHCPv4 and DHCPv6 relay configurations.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for DHCP Relay Service endpoints
router = APIRouter(prefix="/vyos/dhcp-relay", tags=["dhcp-relay-service"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class DHCPRelayBatchRequest(BaseModel):
    """Model for batch DHCP relay configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of DHCP relay operations",
        json_schema_extra={
            "example": [
                {"op": "add_server", "server": "10.0.0.1"},
                {"op": "add_interface", "interface": "eth0"},
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


class RelayOptions(BaseModel):
    """DHCP relay options."""
    hop_count: Optional[str] = None
    max_size: Optional[str] = None
    relay_agents_packets: Optional[str] = None


class DHCPRelayConfig(BaseModel):
    """DHCPv4 relay configuration."""
    configured: bool
    servers: List[str] = Field(default_factory=list)
    interfaces: List[str] = Field(default_factory=list)
    listen_interfaces: List[str] = Field(default_factory=list)
    upstream_interfaces: List[str] = Field(default_factory=list)
    relay_options: Optional[RelayOptions] = None


class DHCPv6InterfaceEntry(BaseModel):
    """DHCPv6 relay interface entry."""
    interface: str
    address: Optional[str] = None


class DHCPv6RelayConfig(BaseModel):
    """DHCPv6 relay configuration."""
    configured: bool
    listen_interfaces: List[DHCPv6InterfaceEntry] = Field(default_factory=list)
    upstream_interfaces: List[DHCPv6InterfaceEntry] = Field(default_factory=list)
    max_hop_count: Optional[str] = None
    use_interface_id_option: bool = False


class DHCPRelayConfigResponse(BaseModel):
    """Full DHCP relay configuration response."""
    dhcp_relay: DHCPRelayConfig
    dhcpv6_relay: DHCPv6RelayConfig

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=DHCPRelayConfigResponse)
async def get_dhcp_relay_config(http_request: Request) -> DHCPRelayConfigResponse:
    """
    Get full DHCP relay configuration from VyOS.

    Returns both DHCPv4 and DHCPv6 relay configurations.
    """
    await require_read_permission(http_request, FeatureGroup.DHCP_RELAY)

    from vyos_mappers.services.dhcp_relay import DHCPRelayMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = DHCPRelayMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return DHCPRelayConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_dhcp_relay_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get DHCP relay capabilities for the connected VyOS version.

    Returns relay options and limits.
    """
    await require_read_permission(http_request, FeatureGroup.DHCP_RELAY)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Relay agents packets options
        relay_agents_packets_options = [
            {"value": "append", "label": "Append", "description": "Append relay information"},
            {"value": "discard", "label": "Discard", "description": "Discard packets with relay info"},
            {"value": "forward", "label": "Forward", "description": "Forward packets unchanged"},
            {"value": "replace", "label": "Replace", "description": "Replace existing relay info"},
        ]

        return {
            "relay_agents_packets_options": relay_agents_packets_options,
            "defaults": {
                "hop_count": 10,
                "max_size": 576,
                "dhcpv6_max_hop_count": 32,
            },
            "limits": {
                "hop_count_max": 255,
                "max_size_max": 1500,
                "dhcpv6_max_hop_count_max": 255,
            },
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_dhcp_relay_batch(http_request: Request, request: DHCPRelayBatchRequest) -> VyOSResponse:
    """
    Configure DHCP relay using batch operations.

    **DHCPv4 Relay Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_server` | server | Add DHCP server |
    | `delete_server` | server | Remove DHCP server |
    | `add_interface` | interface | Add relay interface |
    | `delete_interface` | interface | Remove relay interface |
    | `add_listen_interface` | interface | Add listen interface |
    | `delete_listen_interface` | interface | Remove listen interface |
    | `add_upstream_interface` | interface | Add upstream interface |
    | `delete_upstream_interface` | interface | Remove upstream interface |
    | `set_hop_count` | value | Set hop count limit |
    | `delete_hop_count` | - | Remove hop count limit |
    | `set_max_size` | value | Set max packet size |
    | `delete_max_size` | - | Remove max packet size |
    | `set_relay_agents_packets` | action | Set relay agents packets handling |
    | `delete_relay_agents_packets` | - | Remove relay agents setting |
    | `delete_dhcp_relay` | - | Remove entire DHCP relay config |

    **DHCPv6 Relay Operations:**

    | Operation | Parameters | Description |
    |-----------|------------|-------------|
    | `add_v6_listen_interface` | interface, address? | Add DHCPv6 listen interface |
    | `delete_v6_listen_interface` | interface | Remove DHCPv6 listen interface |
    | `add_v6_upstream_interface` | interface, address? | Add DHCPv6 upstream interface |
    | `delete_v6_upstream_interface` | interface | Remove DHCPv6 upstream interface |
    | `set_v6_max_hop_count` | value | Set DHCPv6 max hop count |
    | `delete_v6_max_hop_count` | - | Remove DHCPv6 max hop count |
    | `enable_v6_interface_id_option` | - | Enable use-interface-id-option |
    | `disable_v6_interface_id_option` | - | Disable use-interface-id-option |
    | `delete_dhcpv6_relay` | - | Remove entire DHCPv6 relay config |
    """
    await require_write_permission(http_request, FeatureGroup.DHCP_RELAY)

    from vyos_mappers.services.dhcp_relay import DHCPRelayMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = DHCPRelayMapper(service.get_version())

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
            interface = operation.get("interface")
            value = operation.get("value")
            action = operation.get("action")
            address = operation.get("address")

            # ================================================================
            # DHCPv4 Relay Operations
            # ================================================================

            if op_type == "add_server":
                if not server:
                    raise HTTPException(status_code=400, detail="add_server requires 'server'")
                set_commands.append(mapper.get_dhcp_relay_server(server))

            elif op_type == "delete_server":
                if not server:
                    raise HTTPException(status_code=400, detail="delete_server requires 'server'")
                delete_commands.append(mapper.get_dhcp_relay_server(server))

            elif op_type == "add_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_interface requires 'interface'")
                set_commands.append(mapper.get_dhcp_relay_interface(interface))

            elif op_type == "delete_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcp_relay_interface(interface))

            elif op_type == "add_listen_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_listen_interface requires 'interface'")
                set_commands.append(mapper.get_dhcp_relay_listen_interface(interface))

            elif op_type == "delete_listen_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_listen_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcp_relay_listen_interface(interface))

            elif op_type == "add_upstream_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_upstream_interface requires 'interface'")
                set_commands.append(mapper.get_dhcp_relay_upstream_interface(interface))

            elif op_type == "delete_upstream_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_upstream_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcp_relay_upstream_interface(interface))

            elif op_type == "set_hop_count":
                if not value:
                    raise HTTPException(status_code=400, detail="set_hop_count requires 'value'")
                set_commands.append(mapper.get_dhcp_relay_relay_options_hop_count(str(value)))

            elif op_type == "delete_hop_count":
                delete_commands.append(["service", "dhcp-relay", "relay-options", "hop-count"])

            elif op_type == "set_max_size":
                if not value:
                    raise HTTPException(status_code=400, detail="set_max_size requires 'value'")
                set_commands.append(mapper.get_dhcp_relay_relay_options_max_size(str(value)))

            elif op_type == "delete_max_size":
                delete_commands.append(["service", "dhcp-relay", "relay-options", "max-size"])

            elif op_type == "set_relay_agents_packets":
                if not action:
                    raise HTTPException(status_code=400, detail="set_relay_agents_packets requires 'action'")
                set_commands.append(mapper.get_dhcp_relay_relay_options_relay_agents_packets(action))

            elif op_type == "delete_relay_agents_packets":
                delete_commands.append(["service", "dhcp-relay", "relay-options", "relay-agents-packets"])

            elif op_type == "delete_dhcp_relay":
                delete_commands.append(mapper.get_dhcp_relay_base())

            # ================================================================
            # DHCPv6 Relay Operations
            # ================================================================

            elif op_type == "add_v6_listen_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_v6_listen_interface requires 'interface'")
                set_commands.append(mapper.get_dhcpv6_relay_listen_interface(interface))
                if address:
                    set_commands.append(mapper.get_dhcpv6_relay_listen_interface_address(interface, address))

            elif op_type == "delete_v6_listen_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_v6_listen_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcpv6_relay_listen_interface(interface))

            elif op_type == "add_v6_upstream_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="add_v6_upstream_interface requires 'interface'")
                set_commands.append(mapper.get_dhcpv6_relay_upstream_interface(interface))
                if address:
                    set_commands.append(mapper.get_dhcpv6_relay_upstream_interface_address(interface, address))

            elif op_type == "delete_v6_upstream_interface":
                if not interface:
                    raise HTTPException(status_code=400, detail="delete_v6_upstream_interface requires 'interface'")
                delete_commands.append(mapper.get_dhcpv6_relay_upstream_interface(interface))

            elif op_type == "set_v6_max_hop_count":
                if not value:
                    raise HTTPException(status_code=400, detail="set_v6_max_hop_count requires 'value'")
                set_commands.append(mapper.get_dhcpv6_relay_max_hop_count(str(value)))

            elif op_type == "delete_v6_max_hop_count":
                delete_commands.append(["service", "dhcpv6-relay", "max-hop-count"])

            elif op_type == "enable_v6_interface_id_option":
                set_commands.append(mapper.get_dhcpv6_relay_use_interface_id_option())

            elif op_type == "disable_v6_interface_id_option":
                delete_commands.append(mapper.get_dhcpv6_relay_use_interface_id_option())

            elif op_type == "delete_dhcpv6_relay":
                delete_commands.append(mapper.get_dhcpv6_relay_base())

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
