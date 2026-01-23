"""
Bridge Interface Configuration Endpoints

All bridge (L2 switch) interface endpoints for VyOS configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for bridge interface endpoints
router = APIRouter(prefix="/vyos/bridge", tags=["bridge-interface"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class BridgeBatchRequest(BaseModel):
    """Model for batch bridge interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., br0)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of interface operations",
        json_schema_extra={
            "example": [
                {"op": "add_member", "value": "eth0"},
                {"op": "add_member", "value": "eth1"},
                {"op": "enable_stp"},
                {"op": "set_address", "value": "10.0.0.1/24"}
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


class BridgeMemberConfig(BaseModel):
    """Bridge member interface configuration."""
    interface: str
    cost: Optional[str] = None
    priority: Optional[str] = None


class IGMPConfig(BaseModel):
    """IGMP configuration."""
    snooping: bool = False
    querier: bool = False


class VIFConfig(BaseModel):
    """VLAN sub-interface configuration."""
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    disable: bool = False


class BridgeInterfaceResponse(BaseModel):
    """Bridge interface configuration from VyOS."""

    name: str = Field(..., description="Interface name (e.g., br0)")
    type: str = Field(default="bridge", description="Interface type")
    addresses: List[str] = Field(default_factory=list, description="IP addresses")
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    disable: bool = False

    # Bridge-specific
    members: List[BridgeMemberConfig] = Field(default_factory=list, description="Member interfaces")
    stp: bool = Field(False, description="STP enabled")
    priority: Optional[str] = Field(None, description="Bridge priority")
    hello_time: Optional[str] = Field(None, description="STP hello time")
    max_age: Optional[str] = Field(None, description="STP max age")
    forward_delay: Optional[str] = Field(None, description="STP forward delay")
    aging: Optional[str] = Field(None, description="MAC aging time")
    enable_vlan: bool = Field(False, description="VLAN filtering enabled")
    igmp: Optional[IGMPConfig] = None
    vif: Optional[List[VIFConfig]] = None

    model_config = ConfigDict(populate_by_name=True)


class BridgeInterfacesResponse(BaseModel):
    """Response containing all bridge interface configurations."""

    interfaces: List[BridgeInterfaceResponse] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)
    stp_enabled: int = Field(0, description="Count of bridges with STP enabled")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "br0",
                        "type": "bridge",
                        "addresses": ["10.0.0.1/24"],
                        "members": [
                            {"interface": "eth0"},
                            {"interface": "eth1"}
                        ],
                        "stp": True
                    }
                ],
                "total": 1,
                "by_type": {"bridge": 1},
                "by_vrf": {},
                "stp_enabled": 1
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=BridgeInterfacesResponse)
async def get_bridge_config(http_request: Request) -> BridgeInterfacesResponse:
    """
    Get all bridge interface configurations from VyOS.

    Returns configuration details including members, STP settings, etc.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bridge import BridgeInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("bridge", {})

        mapper = BridgeInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return BridgeInterfacesResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_bridge_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get bridge interface capabilities for the connected VyOS version.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "stp_supported": True,
            "vlan_filtering_supported": True,
            "igmp_snooping_supported": True,
            "priority_range": {"min": 0, "max": 65535, "default": 32768},
            "hello_time_range": {"min": 1, "max": 10, "default": 2},
            "max_age_range": {"min": 6, "max": 40, "default": 20},
            "forward_delay_range": {"min": 2, "max": 30, "default": 15},
            "aging_range": {"min": 0, "max": 1000000, "default": 300},
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_bridge_batch(http_request: Request, request: BridgeBatchRequest) -> VyOSResponse:
    """
    Configure bridge interface using batch operations.

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
    | `add_member` | Yes | Add member interface |
    | `remove_member` | Yes | Remove member interface |
    | `set_member_cost` | Yes | Set member STP cost (format: "eth0:100") |
    | `set_member_priority` | Yes | Set member STP priority (format: "eth0:32") |
    | `enable_stp` | No | Enable Spanning Tree Protocol |
    | `disable_stp` | No | Disable STP |
    | `set_priority` | Yes | Set bridge priority |
    | `delete_priority` | No | Reset bridge priority |
    | `set_hello_time` | Yes | Set STP hello time |
    | `delete_hello_time` | No | Reset hello time |
    | `set_max_age` | Yes | Set STP max age |
    | `delete_max_age` | No | Reset max age |
    | `set_forward_delay` | Yes | Set STP forward delay |
    | `delete_forward_delay` | No | Reset forward delay |
    | `set_aging` | Yes | Set MAC aging time |
    | `delete_aging` | No | Reset aging time |
    | `enable_vlan` | No | Enable VLAN filtering |
    | `disable_vlan` | No | Disable VLAN filtering |
    | `enable_igmp_snooping` | No | Enable IGMP snooping |
    | `disable_igmp_snooping` | No | Disable IGMP snooping |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |
    | `delete_interface` | No | Delete entire interface |
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bridge import BridgeInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = BridgeInterfaceMapper(service.get_version())

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

            elif op_type == "add_member":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_member_interface(request.interface, value))

            elif op_type == "remove_member":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                delete_commands.append(mapper.get_member_interface(request.interface, value))

            elif op_type == "set_member_cost":
                if not value or ":" not in str(value):
                    raise HTTPException(status_code=400, detail=f"{op_type} requires value in format 'interface:cost'")
                member, cost = str(value).split(":", 1)
                set_commands.append(mapper.get_member_interface_cost(request.interface, member, cost))

            elif op_type == "set_member_priority":
                if not value or ":" not in str(value):
                    raise HTTPException(status_code=400, detail=f"{op_type} requires value in format 'interface:priority'")
                member, priority = str(value).split(":", 1)
                set_commands.append(mapper.get_member_interface_priority(request.interface, member, priority))

            elif op_type == "enable_stp":
                set_commands.append(mapper.get_stp(request.interface))

            elif op_type == "disable_stp":
                delete_commands.append(mapper.get_stp_path(request.interface))

            elif op_type == "set_priority":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_priority(request.interface, str(value)))

            elif op_type == "delete_priority":
                delete_commands.append(mapper.get_priority_path(request.interface))

            elif op_type == "set_hello_time":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_hello_time(request.interface, str(value)))

            elif op_type == "delete_hello_time":
                delete_commands.append(mapper.get_hello_time_path(request.interface))

            elif op_type == "set_max_age":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_max_age(request.interface, str(value)))

            elif op_type == "delete_max_age":
                delete_commands.append(mapper.get_max_age_path(request.interface))

            elif op_type == "set_forward_delay":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_forward_delay(request.interface, str(value)))

            elif op_type == "delete_forward_delay":
                delete_commands.append(mapper.get_forward_delay_path(request.interface))

            elif op_type == "set_aging":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_aging(request.interface, str(value)))

            elif op_type == "delete_aging":
                delete_commands.append(mapper.get_aging_path(request.interface))

            elif op_type == "enable_vlan":
                set_commands.append(mapper.get_vlan_filter(request.interface))

            elif op_type == "disable_vlan":
                delete_commands.append(mapper.get_vlan_filter_path(request.interface))

            elif op_type == "enable_igmp_snooping":
                set_commands.append(mapper.get_igmp_snooping(request.interface))

            elif op_type == "enable_igmp_querier":
                set_commands.append(mapper.get_igmp_querier(request.interface))

            elif op_type == "set_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_mac(request.interface, value))

            elif op_type == "delete_mac":
                delete_commands.append(mapper.get_mac_path(request.interface))

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
