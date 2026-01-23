"""
VXLAN Interface Configuration Endpoints

All VXLAN interface endpoints for VyOS configuration.
Supports unicast, multicast, and EVPN-based VXLAN overlays.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for VXLAN interface endpoints
router = APIRouter(prefix="/vyos/vxlan", tags=["vxlan-interface"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class VXLANBatchRequest(BaseModel):
    """Model for batch VXLAN interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., vxlan0)")
    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of interface operations",
        json_schema_extra={
            "example": [
                {"op": "set_vni", "value": "100"},
                {"op": "set_source_address", "value": "192.168.1.1"},
                {"op": "set_remote", "value": "192.168.2.1"},
                {"op": "set_port", "value": "4789"}
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


class VLANToVNIMapping(BaseModel):
    """VLAN-to-VNI mapping for Single VXLAN Device."""

    vlan: str = Field(..., description="VLAN ID")
    vni: Optional[str] = Field(None, description="VNI value")


class VXLANInterfaceResponse(BaseModel):
    """VXLAN interface configuration from VyOS."""

    name: str = Field(..., description="Interface name (e.g., vxlan0)")
    type: str = Field(default="vxlan", description="Interface type")
    addresses: List[str] = Field(default_factory=list, description="IP addresses")
    description: Optional[str] = None
    vrf: Optional[str] = None
    mtu: Optional[str] = None
    mac: Optional[str] = None
    disable: bool = False

    # VXLAN-specific
    vni: Optional[str] = Field(None, description="VXLAN Network Identifier")
    port: Optional[str] = Field(None, description="UDP port (default: 8472, standard: 4789)")
    source_address: Optional[str] = Field(None, description="Source IP address (underlay)")
    source_interface: Optional[str] = Field(None, description="Source interface")
    remote: Optional[str] = Field(None, description="Remote VTEP address (unicast)")
    group: Optional[str] = Field(None, description="Multicast group address")
    gpe: bool = Field(False, description="Generic Protocol Extension enabled")

    # Parameters (EVPN)
    external: bool = Field(False, description="External control plane (EVPN)")
    nolearning: bool = Field(False, description="Disable FDB learning")
    neighbor_suppress: bool = Field(False, description="ARP/ND suppression")
    vni_filter: bool = Field(False, description="VNI filtering enabled")

    # SVD mappings
    vlan_to_vni: List[VLANToVNIMapping] = Field(default_factory=list, description="VLAN-to-VNI mappings")

    # IP settings
    ip_disable_forwarding: bool = Field(False, description="IP forwarding disabled")
    ipv6_disable_forwarding: bool = Field(False, description="IPv6 forwarding disabled")

    model_config = ConfigDict(populate_by_name=True)


class VXLANInterfacesResponse(BaseModel):
    """Response containing all VXLAN interface configurations."""

    interfaces: List[VXLANInterfaceResponse] = Field(default_factory=list)
    total: int = 0
    by_type: Dict[str, int] = Field(default_factory=dict)
    by_vrf: Dict[str, int] = Field(default_factory=dict)
    by_mode: Dict[str, int] = Field(default_factory=dict, description="unicast/multicast/evpn")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "interfaces": [
                    {
                        "name": "vxlan0",
                        "type": "vxlan",
                        "addresses": [],
                        "vni": "100",
                        "port": "4789",
                        "source_address": "192.168.1.1",
                        "remote": "192.168.2.1"
                    }
                ],
                "total": 1,
                "by_type": {"vxlan": 1},
                "by_vrf": {},
                "by_mode": {"unicast": 1, "multicast": 0, "evpn": 0}
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=VXLANInterfacesResponse)
async def get_vxlan_config(http_request: Request) -> VXLANInterfacesResponse:
    """
    Get all VXLAN interface configurations from VyOS.

    Returns configuration details including VNI, endpoints, EVPN settings, etc.
    """
    await require_read_permission(http_request, FeatureGroup.VXLAN)

    from vyos_mappers.interfaces.vxlan import VXLANInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("vxlan", {})

        mapper = VXLANInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return VXLANInterfacesResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_vxlan_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get VXLAN interface capabilities for the connected VyOS version.

    Returns supported modes, default port, etc.
    """
    await require_read_permission(http_request, FeatureGroup.VXLAN)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "modes": [
                {"value": "unicast", "label": "Unicast", "description": "Single remote VTEP"},
                {"value": "multicast", "label": "Multicast", "description": "Multicast group for VTEP discovery"},
                {"value": "evpn", "label": "EVPN", "description": "BGP L2VPN/EVPN control plane"},
            ],
            "default_port": 8472,
            "standard_port": 4789,
            "supports_svd": True,  # Single VXLAN Device
            "supports_gpe": True,  # Generic Protocol Extension
            "evpn_features": [
                "external",
                "nolearning",
                "neighbor-suppress",
                "vni-filter",
            ],
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_vxlan_batch(http_request: Request, request: VXLANBatchRequest) -> VyOSResponse:
    """
    Configure VXLAN interface using batch operations.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove interface description |
    | `set_address` | Yes | Add IP address (CIDR notation) |
    | `delete_address` | Yes | Remove IP address |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Reset MTU to default |
    | `set_mac` | Yes | Set custom MAC address |
    | `delete_mac` | No | Reset to default MAC |
    | `set_vrf` | Yes | Assign interface to VRF |
    | `delete_vrf` | No | Remove from VRF |
    | `set_vni` | Yes | Set VXLAN Network Identifier |
    | `delete_vni` | No | Remove VNI |
    | `set_port` | Yes | Set UDP port |
    | `delete_port` | No | Reset to default port |
    | `set_source_address` | Yes | Set source IP address |
    | `delete_source_address` | No | Remove source address |
    | `set_source_interface` | Yes | Set source interface |
    | `delete_source_interface` | No | Remove source interface |
    | `set_remote` | Yes | Set remote VTEP address |
    | `delete_remote` | No | Remove remote address |
    | `set_group` | Yes | Set multicast group |
    | `delete_group` | No | Remove multicast group |
    | `enable_gpe` | No | Enable Generic Protocol Extension |
    | `disable_gpe` | No | Disable GPE |
    | `enable_external` | No | Enable external control plane (EVPN) |
    | `disable_external` | No | Disable external control plane |
    | `enable_nolearning` | No | Disable FDB learning |
    | `disable_nolearning` | No | Enable FDB learning |
    | `enable_neighbor_suppress` | No | Enable ARP/ND suppression |
    | `disable_neighbor_suppress` | No | Disable ARP/ND suppression |
    | `enable_vni_filter` | No | Enable VNI filtering |
    | `disable_vni_filter` | No | Disable VNI filtering |
    | `set_vlan_to_vni` | Yes | Map VLAN to VNI (SVD) - value: {"vlan": "10", "vni": "10010"} |
    | `delete_vlan_to_vni` | Yes | Remove VLAN mapping - value: VLAN ID |
    | `disable` | No | Disable interface |
    | `enable` | No | Enable interface |
    | `delete_interface` | No | Delete entire interface |

    **Example - Unicast VXLAN:**
    ```json
    {
        "interface": "vxlan0",
        "operations": [
            {"op": "set_vni", "value": "100"},
            {"op": "set_source_address", "value": "192.168.1.1"},
            {"op": "set_remote", "value": "192.168.2.1"},
            {"op": "set_port", "value": "4789"},
            {"op": "set_description", "value": "VXLAN to Site B"}
        ]
    }
    ```

    **Example - EVPN VXLAN:**
    ```json
    {
        "interface": "vxlan0",
        "operations": [
            {"op": "set_vni", "value": "100"},
            {"op": "set_source_address", "value": "172.16.0.1"},
            {"op": "set_port", "value": "4789"},
            {"op": "enable_external"},
            {"op": "enable_nolearning"},
            {"op": "enable_neighbor_suppress"}
        ]
    }
    ```

    **Example - Single VXLAN Device (SVD):**
    ```json
    {
        "interface": "vxlan0",
        "operations": [
            {"op": "set_source_interface", "value": "dum0"},
            {"op": "enable_external"},
            {"op": "set_vlan_to_vni", "value": {"vlan": "10", "vni": "10010"}},
            {"op": "set_vlan_to_vni", "value": {"vlan": "20", "vni": "10020"}}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.VXLAN)

    from vyos_mappers.interfaces.vxlan import VXLANInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = VXLANInterfaceMapper(service.get_version())

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

            elif op_type == "set_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_mac(request.interface, value))

            elif op_type == "delete_mac":
                delete_commands.append(mapper.get_mac_path(request.interface))

            elif op_type == "set_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_vrf(request.interface, value))

            elif op_type == "delete_vrf":
                delete_commands.append(mapper.get_vrf_path(request.interface))

            elif op_type == "set_vni":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_vni(request.interface, str(value)))

            elif op_type == "delete_vni":
                delete_commands.append(mapper.get_vni_path(request.interface))

            elif op_type == "set_port":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_port(request.interface, str(value)))

            elif op_type == "delete_port":
                delete_commands.append(mapper.get_port_path(request.interface))

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

            elif op_type == "set_group":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_group(request.interface, value))

            elif op_type == "delete_group":
                delete_commands.append(mapper.get_group_path(request.interface))

            elif op_type == "enable_gpe":
                set_commands.append(mapper.get_gpe(request.interface))

            elif op_type == "disable_gpe":
                delete_commands.append(mapper.get_gpe(request.interface))

            elif op_type == "enable_external":
                set_commands.append(mapper.get_external(request.interface))

            elif op_type == "disable_external":
                delete_commands.append(mapper.get_external(request.interface))

            elif op_type == "enable_nolearning":
                set_commands.append(mapper.get_nolearning(request.interface))

            elif op_type == "disable_nolearning":
                delete_commands.append(mapper.get_nolearning(request.interface))

            elif op_type == "enable_neighbor_suppress":
                set_commands.append(mapper.get_neighbor_suppress(request.interface))

            elif op_type == "disable_neighbor_suppress":
                delete_commands.append(mapper.get_neighbor_suppress(request.interface))

            elif op_type == "enable_vni_filter":
                set_commands.append(mapper.get_vni_filter(request.interface))

            elif op_type == "disable_vni_filter":
                delete_commands.append(mapper.get_vni_filter(request.interface))

            elif op_type == "set_vlan_to_vni":
                if not value or not isinstance(value, dict):
                    raise HTTPException(
                        status_code=400,
                        detail=f"{op_type} requires a value with 'vlan' and 'vni' keys"
                    )
                vlan = value.get("vlan")
                vni = value.get("vni")
                if not vlan or not vni:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{op_type} requires both 'vlan' and 'vni' in value"
                    )
                set_commands.append(mapper.get_vlan_to_vni(request.interface, str(vlan), str(vni)))

            elif op_type == "delete_vlan_to_vni":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a VLAN ID")
                delete_commands.append(mapper.get_vlan_to_vni_path(request.interface, str(value)))

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
