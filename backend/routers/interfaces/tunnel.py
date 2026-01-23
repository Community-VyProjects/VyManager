"""
Tunnel Interface Configuration Endpoints

All tunnel interface endpoints for VyOS configuration (GRE, IPIP, SIT, etc.).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for tunnel interface endpoints
router = APIRouter(prefix="/vyos/tunnel", tags=["tunnel-interface"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class TunnelBatchRequest(BaseModel):
    """Model for batch tunnel interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., tun0)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of interface operations",
        json_schema_extra={
            "example": [
                {"op": "set_encapsulation", "value": "gre"},
                {"op": "set_source_address", "value": "192.168.1.1"},
                {"op": "set_remote", "value": "192.168.2.1"},
                {"op": "set_address", "value": "10.0.0.1/30"}
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


class TunnelInterfaceResponse(BaseModel):
    """Tunnel interface configuration from VyOS."""

    name: str = Field(..., description="Interface name (e.g., tun0)")
    type: str = Field(default="tunnel", description="Interface type")
    addresses: List[str] = Field(default_factory=list, description="IP addresses")
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    disable: bool = False

    # Tunnel-specific
    encapsulation: Optional[str] = Field(None, description="Encapsulation type (gre, ipip, sit, etc.)")
    source_address: Optional[str] = Field(None, description="Tunnel source address")
    source_interface: Optional[str] = Field(None, description="Tunnel source interface")
    remote: Optional[str] = Field(None, description="Tunnel remote endpoint")
    key: Optional[str] = Field(None, description="GRE key")
    dont_fragment: bool = Field(False, description="Don't fragment flag")
    ignore_df: bool = Field(False, description="Ignore DF flag")
    multicast: Optional[bool] = Field(None, description="Multicast enabled")
    ttl: Optional[str] = Field(None, description="TTL value")

    # 6rd specific
    six_rd_prefix: Optional[str] = Field(None, alias="6rd_prefix", description="6rd prefix")
    six_rd_relay_prefix: Optional[str] = Field(None, alias="6rd_relay_prefix", description="6rd relay prefix")

    model_config = ConfigDict(populate_by_name=True)


class TunnelInterfacesResponse(BaseModel):
    """Response containing all tunnel interface configurations."""

    interfaces: List[TunnelInterfaceResponse] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)
    by_encapsulation: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "tun0",
                        "type": "tunnel",
                        "addresses": ["10.0.0.1/30"],
                        "encapsulation": "gre",
                        "source_address": "192.168.1.1",
                        "remote": "192.168.2.1"
                    }
                ],
                "total": 1,
                "by_type": {"tunnel": 1},
                "by_vrf": {},
                "by_encapsulation": {"gre": 1}
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=TunnelInterfacesResponse)
async def get_tunnel_config(http_request: Request) -> TunnelInterfacesResponse:
    """
    Get all tunnel interface configurations from VyOS.

    Returns configuration details including encapsulation type, endpoints, etc.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.tunnel import TunnelInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("tunnel", {})

        mapper = TunnelInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return TunnelInterfacesResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_tunnel_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get tunnel interface capabilities for the connected VyOS version.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        encapsulation_types = [
            {"value": "gre", "label": "GRE", "description": "Generic Routing Encapsulation"},
            {"value": "gretap", "label": "GRE TAP", "description": "GRE TAP (L2)"},
            {"value": "ipip", "label": "IPIP", "description": "IP-in-IP (IPv4 over IPv4)"},
            {"value": "ipip6", "label": "IPIP6", "description": "IPv4 over IPv6"},
            {"value": "ip6ip6", "label": "IP6IP6", "description": "IPv6 over IPv6"},
            {"value": "ip6gre", "label": "IP6GRE", "description": "GRE over IPv6"},
            {"value": "ip6gretap", "label": "IP6GRE TAP", "description": "GRE TAP over IPv6"},
            {"value": "sit", "label": "SIT", "description": "Simple Internet Transition (6in4)"},
        ]

        return {
            "encapsulation_types": encapsulation_types,
            "supports_key": ["gre", "gretap", "ip6gre", "ip6gretap"],
            "supports_6rd": ["sit"],
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_tunnel_batch(http_request: Request, request: TunnelBatchRequest) -> VyOSResponse:
    """
    Configure tunnel interface using batch operations.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove interface description |
    | `set_address` | Yes | Add IP address (CIDR notation) |
    | `delete_address` | Yes | Remove IP address |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Reset MTU to default |
    | `set_vrf` | Yes | Assign interface to VRF |
    | `delete_vrf` | No | Remove from VRF |
    | `set_encapsulation` | Yes | Set encapsulation type |
    | `set_source_address` | Yes | Set tunnel source address |
    | `delete_source_address` | No | Remove source address |
    | `set_source_interface` | Yes | Set tunnel source interface |
    | `delete_source_interface` | No | Remove source interface |
    | `set_remote` | Yes | Set tunnel remote endpoint |
    | `delete_remote` | No | Remove remote endpoint |
    | `set_key` | Yes | Set GRE key |
    | `delete_key` | No | Remove GRE key |
    | `set_ttl` | Yes | Set TTL value |
    | `delete_ttl` | No | Remove TTL |
    | `enable_dont_fragment` | No | Enable don't fragment |
    | `disable_dont_fragment` | No | Disable don't fragment |
    | `enable_multicast` | No | Enable multicast |
    | `disable_multicast` | No | Disable multicast |
    | `set_6rd_prefix` | Yes | Set 6rd prefix (SIT) |
    | `set_6rd_relay_prefix` | Yes | Set 6rd relay prefix |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |
    | `delete_interface` | No | Delete entire interface |

    **Example - GRE Tunnel:**
    ```json
    {
        "interface": "tun0",
        "operations": [
            {"op": "set_encapsulation", "value": "gre"},
            {"op": "set_source_address", "value": "192.168.1.1"},
            {"op": "set_remote", "value": "192.168.2.1"},
            {"op": "set_address", "value": "10.0.0.1/30"},
            {"op": "set_description", "value": "GRE to Site B"}
        ]
    }
    ```

    **Example - SIT Tunnel with 6rd:**
    ```json
    {
        "interface": "tun1",
        "operations": [
            {"op": "set_encapsulation", "value": "sit"},
            {"op": "set_source_interface", "value": "eth0"},
            {"op": "set_6rd_prefix", "value": "2001:db8::/32"},
            {"op": "set_6rd_relay_prefix", "value": "192.0.2.0/24"}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.tunnel import TunnelInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = TunnelInterfaceMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Map operations to VyOS commands
            if op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_description(request.interface, value))

            elif op_type == "delete_description":
                delete_commands.append(mapper.get_description_path(request.interface))

            elif op_type == "set_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_address(request.interface, value))

            elif op_type == "delete_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                delete_commands.append(mapper.get_address(request.interface, value))

            elif op_type == "set_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_mtu(request.interface, str(value)))

            elif op_type == "delete_mtu":
                delete_commands.append(mapper.get_mtu_path(request.interface))

            elif op_type == "set_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_vrf(request.interface, value))

            elif op_type == "delete_vrf":
                delete_commands.append(mapper.get_vrf_path(request.interface))

            elif op_type == "set_encapsulation":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_encapsulation(request.interface, value))

            elif op_type == "set_source_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_source_address(request.interface, value))

            elif op_type == "delete_source_address":
                delete_commands.append(mapper.get_source_address_path(request.interface))

            elif op_type == "set_source_interface":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_source_interface(request.interface, value))

            elif op_type == "delete_source_interface":
                delete_commands.append(mapper.get_source_interface_path(request.interface))

            elif op_type == "set_remote":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_remote(request.interface, value))

            elif op_type == "delete_remote":
                delete_commands.append(mapper.get_remote_path(request.interface))

            elif op_type == "set_key":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_key(request.interface, str(value)))

            elif op_type == "delete_key":
                delete_commands.append(mapper.get_key_path(request.interface))

            elif op_type == "set_ttl":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_ttl(request.interface, str(value)))

            elif op_type == "delete_ttl":
                delete_commands.append(mapper.get_ttl_path(request.interface))

            elif op_type == "enable_dont_fragment":
                set_commands.append(mapper.get_dont_fragment(request.interface))

            elif op_type == "disable_dont_fragment":
                delete_commands.append(mapper.get_dont_fragment_path(request.interface))

            elif op_type == "enable_multicast":
                set_commands.append(mapper.get_multicast(request.interface))

            elif op_type == "disable_multicast":
                delete_commands.append(mapper.get_multicast_path(request.interface))

            elif op_type == "set_6rd_prefix":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_6rd_prefix(request.interface, value))

            elif op_type == "set_6rd_relay_prefix":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_6rd_relay_prefix(request.interface, value))

            elif op_type == "disable":
                set_commands.append(mapper.get_disable(request.interface))

            elif op_type == "enable":
                delete_commands.append(mapper.get_disable(request.interface))

            elif op_type == "delete_interface":
                delete_commands.append(mapper.get_interface(request.interface))

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

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
