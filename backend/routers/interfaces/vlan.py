"""
VLAN Interface Configuration Endpoints

All VLAN (802.1q) sub-interface endpoints for VyOS configuration.
Supports standard VLANs (vif) and QinQ (vif-s/vif-c).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for VLAN interface endpoints
router = APIRouter(prefix="/vyos/vlan", tags=["vlan-interface"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class VLANBatchRequest(BaseModel):
    """Model for batch VLAN interface configuration."""

    parent_type: str = Field(..., description="Parent interface type (ethernet, bonding, bridge)")
    parent_interface: str = Field(..., description="Parent interface name (e.g., eth0, bond0)")
    vlan_id: str = Field(..., description="VLAN ID (1-4094)")
    vlan_type: str = Field(default="vif", description="VLAN type (vif, vif-s, vif-c)")
    s_vlan_id: Optional[str] = Field(None, description="Service VLAN ID (required for vif-c)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of VLAN operations",
        json_schema_extra={
            "example": [
                {"op": "set_address", "value": "10.0.100.1/24"},
                {"op": "set_description", "value": "VLAN 100 - Management"},
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


class VLANInterfaceResponse(BaseModel):
    """VLAN interface configuration from VyOS."""

    name: str = Field(..., description="Full VLAN name (e.g., eth0.100)")
    vlan_id: str = Field(..., description="VLAN ID")
    vlan_type: str = Field(..., description="VLAN type (vif, vif-s, vif-c)")
    parent_type: str = Field(..., description="Parent interface type")
    parent_interface: str = Field(..., description="Parent interface name")
    s_vlan_id: Optional[str] = Field(None, description="Service VLAN ID (for vif-c)")
    addresses: List[str] = Field(default_factory=list, description="IP addresses")
    description: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    vrf: Optional[str] = None
    disable: bool = False

    model_config = ConfigDict(populate_by_name=True)


class VLANInterfacesResponse(BaseModel):
    """Response containing all VLAN interface configurations."""

    vlans: List[VLANInterfaceResponse] = Field(default_factory=list)
    total: int = 0
    by_parent_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vlans": [
                    {
                        "name": "eth0.100",
                        "vlan_id": "100",
                        "vlan_type": "vif",
                        "parent_type": "ethernet",
                        "parent_interface": "eth0",
                        "addresses": ["10.0.100.1/24"],
                        "description": "Management VLAN"
                    }
                ],
                "total": 1,
                "by_parent_type": {"ethernet": 1},
                "by_vrf": {}
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=VLANInterfacesResponse)
async def get_vlan_config(http_request: Request) -> VLANInterfacesResponse:
    """
    Get all VLAN interface configurations from VyOS.

    Returns VLANs from all parent interface types (ethernet, bonding, bridge).
    Includes both standard VLANs (vif) and QinQ (vif-s, vif-c).
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.vlan import VLANInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = VLANInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_all_vlans(full_config)

        return VLANInterfacesResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_vlan_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get VLAN interface capabilities for the connected VyOS version.

    Returns supported parent types and VLAN options.
    """
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        parent_types = [
            {"value": "ethernet", "label": "Ethernet", "description": "Physical ethernet interfaces"},
            {"value": "bonding", "label": "Bonding", "description": "Link aggregation interfaces"},
            {"value": "bridge", "label": "Bridge", "description": "Bridge interfaces"},
        ]

        vlan_types = [
            {"value": "vif", "label": "802.1q VLAN", "description": "Standard VLAN tagging"},
            {"value": "vif-s", "label": "QinQ Service", "description": "QinQ outer/service VLAN"},
            {"value": "vif-c", "label": "QinQ Customer", "description": "QinQ inner/customer VLAN"},
        ]

        return {
            "parent_types": parent_types,
            "vlan_types": vlan_types,
            "vlan_id_range": {"min": 1, "max": 4094},
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_vlan_batch(http_request: Request, request: VLANBatchRequest) -> VyOSResponse:
    """
    Configure VLAN interface using batch operations.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `create` | No | Create VLAN interface |
    | `delete` | No | Delete VLAN interface |
    | `set_address` | Yes | Add IP address (CIDR) |
    | `delete_address` | Yes | Remove IP address |
    | `set_description` | Yes | Set description |
    | `delete_description` | No | Remove description |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Reset MTU |
    | `set_vrf` | Yes | Assign to VRF |
    | `delete_vrf` | No | Remove from VRF |
    | `set_mac` | Yes | Set MAC address |
    | `delete_mac` | No | Remove MAC override |
    | `enable_dhcp` | No | Enable DHCP |
    | `disable_dhcp` | No | Disable DHCP |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |

    **Example Request:**
    ```json
    {
        "parent_type": "ethernet",
        "parent_interface": "eth0",
        "vlan_id": "100",
        "vlan_type": "vif",
        "operations": [
            {"op": "create"},
            {"op": "set_address", "value": "10.0.100.1/24"},
            {"op": "set_description", "value": "Management VLAN"}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces.vlan import VLANInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = VLANInterfaceMapper(service.get_version())

        set_commands = []
        delete_commands = []

        pt = request.parent_type
        pi = request.parent_interface
        vid = request.vlan_id
        vt = request.vlan_type
        svid = request.s_vlan_id

        # Validate vif-c requires s_vlan_id
        if vt == "vif-c" and not svid:
            raise HTTPException(
                status_code=400,
                detail="vif-c (QinQ customer VLAN) requires s_vlan_id"
            )

        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Route to appropriate VLAN type methods
            if vt == "vif":
                # Standard VLAN operations
                if op_type == "create":
                    set_commands.append(mapper.get_vif(pt, pi, vid))

                elif op_type == "delete":
                    delete_commands.append(mapper.get_vif(pt, pi, vid))

                elif op_type == "set_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_address(pt, pi, vid, value))

                elif op_type == "delete_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    delete_commands.append(mapper.get_vif_address(pt, pi, vid, value))

                elif op_type == "set_description":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_description(pt, pi, vid, value))

                elif op_type == "delete_description":
                    delete_commands.append(mapper.get_vif_description_path(pt, pi, vid))

                elif op_type == "set_mtu":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_mtu(pt, pi, vid, str(value)))

                elif op_type == "delete_mtu":
                    delete_commands.append(mapper.get_vif_mtu_path(pt, pi, vid))

                elif op_type == "set_vrf":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_vrf(pt, pi, vid, value))

                elif op_type == "delete_vrf":
                    delete_commands.append(mapper.get_vif_vrf_path(pt, pi, vid))

                elif op_type == "set_mac":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_mac(pt, pi, vid, value))

                elif op_type == "delete_mac":
                    delete_commands.append(mapper.get_vif_mac_path(pt, pi, vid))

                elif op_type == "enable_dhcp":
                    set_commands.append(mapper.get_vif_dhcp(pt, pi, vid))

                elif op_type == "disable_dhcp":
                    delete_commands.append(mapper.get_vif_dhcp(pt, pi, vid))

                elif op_type == "enable_dhcpv6":
                    set_commands.append(mapper.get_vif_dhcpv6(pt, pi, vid))

                elif op_type == "disable_dhcpv6":
                    delete_commands.append(mapper.get_vif_dhcpv6(pt, pi, vid))

                elif op_type == "disable":
                    set_commands.append(mapper.get_vif_disable(pt, pi, vid))

                elif op_type == "enable":
                    delete_commands.append(mapper.get_vif_disable(pt, pi, vid))

                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation: {op_type}")

            elif vt == "vif-s":
                # QinQ Service VLAN operations
                if op_type == "create":
                    set_commands.append(mapper.get_vif_s(pt, pi, vid))

                elif op_type == "delete":
                    delete_commands.append(mapper.get_vif_s(pt, pi, vid))

                elif op_type == "set_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_s_address(pt, pi, vid, value))

                elif op_type == "delete_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    delete_commands.append(mapper.get_vif_s_address(pt, pi, vid, value))

                elif op_type == "set_description":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_s_description(pt, pi, vid, value))

                elif op_type == "delete_description":
                    delete_commands.append(mapper.get_vif_s_description_path(pt, pi, vid))

                elif op_type == "set_mtu":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_s_mtu(pt, pi, vid, str(value)))

                elif op_type == "set_vrf":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_s_vrf(pt, pi, vid, value))

                elif op_type == "disable":
                    set_commands.append(mapper.get_vif_s_disable(pt, pi, vid))

                elif op_type == "enable":
                    delete_commands.append(mapper.get_vif_s_disable(pt, pi, vid))

                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation for vif-s: {op_type}")

            elif vt == "vif-c":
                # QinQ Customer VLAN operations
                if op_type == "create":
                    set_commands.append(mapper.get_vif_c(pt, pi, svid, vid))

                elif op_type == "delete":
                    delete_commands.append(mapper.get_vif_c(pt, pi, svid, vid))

                elif op_type == "set_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_c_address(pt, pi, svid, vid, value))

                elif op_type == "delete_address":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    delete_commands.append(mapper.get_vif_c_address(pt, pi, svid, vid, value))

                elif op_type == "set_description":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_c_description(pt, pi, svid, vid, value))

                elif op_type == "set_mtu":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_c_mtu(pt, pi, svid, vid, str(value)))

                elif op_type == "set_vrf":
                    if not value:
                        raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                    set_commands.append(mapper.get_vif_c_vrf(pt, pi, svid, vid, value))

                elif op_type == "disable":
                    set_commands.append(mapper.get_vif_c_disable(pt, pi, svid, vid))

                elif op_type == "enable":
                    delete_commands.append(mapper.get_vif_c_disable(pt, pi, svid, vid))

                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported operation for vif-c: {op_type}")

            else:
                raise HTTPException(status_code=400, detail=f"Unknown VLAN type: {vt}")

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
