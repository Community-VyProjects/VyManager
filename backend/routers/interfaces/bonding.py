"""
Bonding Interface Configuration Endpoints

All bonding (link aggregation) interface endpoints for VyOS configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for bonding interface endpoints
router = APIRouter(prefix="/vyos/bonding", tags=["bonding-interface"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class BondingBatchRequest(BaseModel):
    """Model for batch bonding interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., bond0)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of interface operations",
        json_schema_extra={
            "example": [
                {"op": "set_mode", "value": "802.3ad"},
                {"op": "set_hash_policy", "value": "layer3+4"},
                {"op": "add_member", "value": "eth0"},
                {"op": "add_member", "value": "eth1"},
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


class ARPMonitorConfig(BaseModel):
    """ARP monitor configuration."""
    interval: Optional[str] = None
    targets: List[str] = Field(default_factory=list)


class VIFConfig(BaseModel):
    """VLAN sub-interface configuration."""
    vlan_id: str
    addresses: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[str] = None
    vrf: Optional[str] = None
    disable: bool = False


class BondingInterfaceResponse(BaseModel):
    """Bonding interface configuration from VyOS."""

    name: str = Field(..., description="Interface name (e.g., bond0)")
    type: str = Field(default="bonding", description="Interface type")
    addresses: List[str] = Field(default_factory=list, description="IP addresses")
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    disable: bool = False

    # Bonding-specific
    mode: Optional[str] = Field(None, description="Bonding mode (802.3ad, balance-rr, etc.)")
    hash_policy: Optional[str] = Field(None, description="Hash policy for load balancing")
    members: List[str] = Field(default_factory=list, description="Member interfaces")
    primary: Optional[str] = Field(None, description="Primary interface for active-backup")
    lacp_rate: Optional[str] = Field(None, description="LACP rate (slow/fast)")
    min_links: Optional[str] = Field(None, description="Minimum links required")
    arp_monitor: Optional[ARPMonitorConfig] = None
    vif: Optional[List[VIFConfig]] = None

    model_config = ConfigDict(populate_by_name=True)


class BondingInterfacesResponse(BaseModel):
    """Response containing all bonding interface configurations."""

    interfaces: List[BondingInterfaceResponse] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)
    by_mode: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "bond0",
                        "type": "bonding",
                        "addresses": ["10.0.0.1/24"],
                        "mode": "802.3ad",
                        "hash_policy": "layer3+4",
                        "members": ["eth0", "eth1"],
                        "lacp_rate": "fast"
                    }
                ],
                "total": 1,
                "by_type": {"bonding": 1},
                "by_vrf": {},
                "by_mode": {"802.3ad": 1}
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=BondingInterfacesResponse)
async def get_bonding_config(http_request: Request) -> BondingInterfacesResponse:
    """
    Get all bonding interface configurations from VyOS.

    Returns configuration details including mode, members, hash policy, etc.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bonding import BondingInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("bonding", {})

        mapper = BondingInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return BondingInterfacesResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_bonding_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get bonding interface capabilities for the connected VyOS version.

    Returns supported modes, hash policies, and other options.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Standard bonding modes supported by VyOS
        modes = [
            {"value": "802.3ad", "label": "802.3ad (LACP)", "description": "Link Aggregation Control Protocol"},
            {"value": "balance-rr", "label": "Balance Round-Robin", "description": "Round-robin transmit policy"},
            {"value": "active-backup", "label": "Active-Backup", "description": "Only one slave active"},
            {"value": "balance-xor", "label": "Balance XOR", "description": "XOR transmit policy"},
            {"value": "broadcast", "label": "Broadcast", "description": "Transmit on all slaves"},
            {"value": "balance-tlb", "label": "Balance TLB", "description": "Adaptive transmit load balancing"},
            {"value": "balance-alb", "label": "Balance ALB", "description": "Adaptive load balancing"},
        ]

        hash_policies = [
            {"value": "layer2", "label": "Layer 2", "description": "Uses MAC addresses"},
            {"value": "layer2+3", "label": "Layer 2+3", "description": "Uses MAC and IP addresses"},
            {"value": "layer3+4", "label": "Layer 3+4", "description": "Uses IP addresses and ports"},
            {"value": "encap2+3", "label": "Encap 2+3", "description": "Encapsulated layer 2+3"},
            {"value": "encap3+4", "label": "Encap 3+4", "description": "Encapsulated layer 3+4"},
        ]

        lacp_rates = [
            {"value": "slow", "label": "Slow", "description": "30 second interval"},
            {"value": "fast", "label": "Fast", "description": "1 second interval"},
        ]

        return {
            "modes": modes,
            "hash_policies": hash_policies,
            "lacp_rates": lacp_rates,
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_bonding_batch(http_request: Request, request: BondingBatchRequest) -> VyOSResponse:
    """
    Configure bonding interface using batch operations.

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
    | `set_mode` | Yes | Set bonding mode |
    | `set_hash_policy` | Yes | Set hash policy |
    | `delete_hash_policy` | No | Remove hash policy |
    | `add_member` | Yes | Add member interface |
    | `remove_member` | Yes | Remove member interface |
    | `set_primary` | Yes | Set primary interface |
    | `delete_primary` | No | Remove primary setting |
    | `set_lacp_rate` | Yes | Set LACP rate (slow/fast) |
    | `delete_lacp_rate` | No | Remove LACP rate |
    | `set_min_links` | Yes | Set minimum links |
    | `delete_min_links` | No | Remove min links |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |
    | `delete_interface` | No | Delete entire interface |

    **Example Request:**
    ```json
    {
        "interface": "bond0",
        "operations": [
            {"op": "set_mode", "value": "802.3ad"},
            {"op": "set_hash_policy", "value": "layer3+4"},
            {"op": "set_lacp_rate", "value": "fast"},
            {"op": "add_member", "value": "eth0"},
            {"op": "add_member", "value": "eth1"},
            {"op": "set_address", "value": "10.0.0.1/24"},
            {"op": "set_description", "value": "LACP Bond"}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.bonding import BondingInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = BondingInterfaceMapper(service.get_version())

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

            elif op_type == "set_mode":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_mode(request.interface, value))

            elif op_type == "set_hash_policy":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_hash_policy(request.interface, value))

            elif op_type == "delete_hash_policy":
                delete_commands.append(mapper.get_hash_policy_path(request.interface))

            elif op_type == "add_member":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_member_interface(request.interface, value))

            elif op_type == "remove_member":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                delete_commands.append(mapper.get_member_interface(request.interface, value))

            elif op_type == "set_primary":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_primary(request.interface, value))

            elif op_type == "delete_primary":
                delete_commands.append(mapper.get_primary_path(request.interface))

            elif op_type == "set_lacp_rate":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_lacp_rate(request.interface, value))

            elif op_type == "delete_lacp_rate":
                delete_commands.append(mapper.get_lacp_rate_path(request.interface))

            elif op_type == "set_min_links":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_min_links(request.interface, str(value)))

            elif op_type == "delete_min_links":
                delete_commands.append(mapper.get_min_links_path(request.interface))

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
