"""
VRF (Virtual Routing and Forwarding) Configuration Endpoints

All VRF endpoints for VyOS configuration.
Supports VRF instances, routing tables, static routes, and BGP/OSPF within VRFs.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for VRF endpoints
router = APIRouter(prefix="/vyos/vrf", tags=["vrf"])


# ============================================================================
# Request Models
# ============================================================================


class VRFBatchRequest(BaseModel):
    """Model for batch VRF configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of VRF operations",
        json_schema_extra={
            "example": [
                {"op": "create_vrf", "name": "MGMT", "table": "100"},
                {"op": "set_vrf_description", "name": "MGMT", "value": "Management VRF"},
            ]
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Response Models
# ============================================================================


class VRFNextHop(BaseModel):
    """VRF static route next-hop."""
    address: str
    distance: Optional[str] = None
    disable: bool = False


class VRFStaticRoute(BaseModel):
    """VRF static route."""
    network: str
    next_hops: List[VRFNextHop] = Field(default_factory=list)
    blackhole: bool = False
    interfaces: List[str] = Field(default_factory=list)


class VRFBGPNeighbor(BaseModel):
    """VRF BGP neighbor."""
    address: str
    remote_as: Optional[str] = None


class VRFBGPAddressFamily(BaseModel):
    """VRF BGP address family."""
    name: str
    redistribute: List[str] = Field(default_factory=list)
    import_vpn: bool = False
    export_vpn: bool = False
    import_vrfs: List[str] = Field(default_factory=list)
    rd_export: Optional[str] = None
    route_target_import: Optional[str] = None
    route_target_export: Optional[str] = None
    route_target_both: Optional[str] = None


class VRFBGP(BaseModel):
    """VRF BGP configuration."""
    system_as: Optional[str] = None
    router_id: Optional[str] = None
    neighbors: List[VRFBGPNeighbor] = Field(default_factory=list)
    address_families: List[VRFBGPAddressFamily] = Field(default_factory=list)


class VRFOSPFArea(BaseModel):
    """VRF OSPF area."""
    id: str
    networks: List[str] = Field(default_factory=list)


class VRFOSPF(BaseModel):
    """VRF OSPF configuration."""
    areas: List[VRFOSPFArea] = Field(default_factory=list)
    redistribute: List[str] = Field(default_factory=list)


class VRF(BaseModel):
    """VRF instance."""
    name: str
    table: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    interfaces: List[str] = Field(default_factory=list)
    static_routes_ipv4: List[VRFStaticRoute] = Field(default_factory=list)
    static_routes_ipv6: List[VRFStaticRoute] = Field(default_factory=list)
    bgp: Optional[VRFBGP] = None
    ospf: Optional[VRFOSPF] = None


class VRFConfigResponse(BaseModel):
    """Full VRF configuration response."""
    configured: bool
    bind_to_all: bool = False
    vrfs: List[VRF] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# READ Operations
# ============================================================================


@router.get("/config", response_model=VRFConfigResponse)
async def get_vrf_config(http_request: Request) -> VRFConfigResponse:
    """
    Get full VRF configuration from VyOS.

    Returns all VRF instances with their routing tables, interfaces, and protocols.
    """
    await require_read_permission(http_request, FeatureGroup.VRF)

    from vyos_mappers.vrf import VRFMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)

        mapper = VRFMapper(service.get_version())
        parsed_data = mapper.parse_full_config(full_config)

        return VRFConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_vrf_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get VRF capabilities for the connected VyOS version.
    """
    await require_read_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        return {
            "redistribute_protocols": [
                {"value": "static", "label": "Static Routes"},
                {"value": "connected", "label": "Connected"},
                {"value": "bgp", "label": "BGP"},
                {"value": "ospf", "label": "OSPF"},
                {"value": "rip", "label": "RIP"},
                {"value": "kernel", "label": "Kernel"},
            ],
            "route_filter_protocols": [
                {"value": "any", "label": "Any"},
                {"value": "bgp", "label": "BGP"},
                {"value": "connected", "label": "Connected"},
                {"value": "isis", "label": "IS-IS"},
                {"value": "kernel", "label": "Kernel"},
                {"value": "ospf", "label": "OSPF"},
                {"value": "rip", "label": "RIP"},
                {"value": "static", "label": "Static"},
            ],
            "address_families": [
                {"value": "ipv4-unicast", "label": "IPv4 Unicast"},
                {"value": "ipv6-unicast", "label": "IPv6 Unicast"},
            ],
            "table_range": {"min": 1, "max": 65535},
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vrf_name}/routes")
async def get_vrf_routes(vrf_name: str, http_request: Request) -> Dict[str, Any]:
    """
    Get the routing table for a specific VRF.
    """
    await require_read_permission(http_request, FeatureGroup.VRF)

    try:
        service = get_session_vyos_service(http_request)

        # Execute 'show ip route vrf <name>' command
        result = await run_in_threadpool(
            service.execute_op_command,
            f"show ip route vrf {vrf_name}"
        )

        return {
            "success": True,
            "vrf": vrf_name,
            "data": result.get("data", {}),
        }
    except Exception as e:
        return {"success": False, "vrf": vrf_name, "data": {}, "error": str(e)}


# ============================================================================
# WRITE Operations
# ============================================================================


@router.post("/batch", response_model=VyOSResponse)
async def configure_vrf_batch(
    request: VRFBatchRequest,
    http_request: Request,
) -> VyOSResponse:
    """
    Configure VRF using batch operations.

    **VRF Instance Operations:**
    - create_vrf, delete_vrf
    - set_vrf_table, set_vrf_description, delete_vrf_description
    - enable_vrf, disable_vrf
    - enable_bind_to_all, disable_bind_to_all

    **Interface Operations:**
    - assign_interface_to_vrf, remove_interface_from_vrf

    **Static Route Operations:**
    - add_vrf_static_route, delete_vrf_static_route
    - add_vrf_static_route_next_hop, delete_vrf_static_route_next_hop
    - add_vrf_static_route6, delete_vrf_static_route6

    **BGP Operations:**
    - set_vrf_bgp_as, delete_vrf_bgp
    - add_vrf_bgp_neighbor, delete_vrf_bgp_neighbor
    - add_vrf_bgp_redistribute
    - set_vrf_bgp_import_vrf

    **OSPF Operations:**
    - set_vrf_ospf_area_network, delete_vrf_ospf_area_network
    - add_vrf_ospf_redistribute
    """
    await require_write_permission(http_request, FeatureGroup.VRF)

    from vyos_mappers.vrf import VRFMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = VRFMapper(service.get_version())

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
            network = operation.get("network")
            next_hop = operation.get("next_hop")
            interface = operation.get("interface")
            interface_type = operation.get("interface_type", "ethernet")
            area = operation.get("area")
            neighbor = operation.get("neighbor")
            af = operation.get("address_family", "ipv4-unicast")
            protocol = operation.get("protocol")

            # ================================================================
            # VRF Instance Operations
            # ================================================================

            if op_type == "create_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="create_vrf requires 'name'")
                table = operation.get("table")
                if not table:
                    raise HTTPException(status_code=400, detail="create_vrf requires 'table'")
                set_commands.append(mapper.get_vrf_table(name, str(table)))

            elif op_type == "delete_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrf requires 'name'")
                delete_commands.append(mapper.get_vrf(name))

            elif op_type == "set_vrf_table":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_table requires 'name' and 'value'")
                set_commands.append(mapper.get_vrf_table(name, str(value)))

            elif op_type == "set_vrf_description":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_description requires 'name' and 'value'")
                set_commands.append(mapper.get_vrf_description(name, value))

            elif op_type == "delete_vrf_description":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrf_description requires 'name'")
                delete_commands.append(mapper.get_vrf_description_path(name))

            elif op_type == "disable_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="disable_vrf requires 'name'")
                set_commands.append(mapper.get_vrf_disable(name))

            elif op_type == "enable_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrf requires 'name'")
                delete_commands.append(mapper.get_vrf_disable(name))

            elif op_type == "enable_bind_to_all":
                set_commands.append(["vrf", "bind-to-all"])

            elif op_type == "disable_bind_to_all":
                delete_commands.append(["vrf", "bind-to-all"])

            # ================================================================
            # Interface Operations
            # ================================================================

            elif op_type == "assign_interface_to_vrf":
                if not name or not interface:
                    raise HTTPException(status_code=400, detail="assign_interface_to_vrf requires 'name' and 'interface'")
                # Parse interface type from name (e.g., eth0 -> ethernet, eth0)
                if interface.startswith("eth"):
                    interface_type = "ethernet"
                elif interface.startswith("bond"):
                    interface_type = "bonding"
                elif interface.startswith("br"):
                    interface_type = "bridge"
                elif interface.startswith("dum"):
                    interface_type = "dummy"
                elif interface.startswith("vxlan"):
                    interface_type = "vxlan"
                elif interface.startswith("tun"):
                    interface_type = "tunnel"
                elif interface.startswith("wg"):
                    interface_type = "wireguard"
                else:
                    interface_type = "ethernet"
                set_commands.append(mapper.get_interface_vrf(interface_type, interface, name))

            elif op_type == "remove_interface_from_vrf":
                if not interface:
                    raise HTTPException(status_code=400, detail="remove_interface_from_vrf requires 'interface'")
                # Parse interface type from name
                if interface.startswith("eth"):
                    interface_type = "ethernet"
                elif interface.startswith("bond"):
                    interface_type = "bonding"
                elif interface.startswith("br"):
                    interface_type = "bridge"
                elif interface.startswith("dum"):
                    interface_type = "dummy"
                elif interface.startswith("vxlan"):
                    interface_type = "vxlan"
                elif interface.startswith("tun"):
                    interface_type = "tunnel"
                elif interface.startswith("wg"):
                    interface_type = "wireguard"
                else:
                    interface_type = "ethernet"
                delete_commands.append(mapper.get_interface_vrf_path(interface_type, interface))

            # ================================================================
            # Static Route Operations
            # ================================================================

            elif op_type == "add_vrf_static_route":
                if not name or not network or not next_hop:
                    raise HTTPException(status_code=400, detail="add_vrf_static_route requires 'name', 'network', and 'next_hop'")
                set_commands.append(mapper.get_vrf_static_route_next_hop(name, network, next_hop))
                distance = operation.get("distance")
                if distance:
                    set_commands.append(mapper.get_vrf_static_route_next_hop_distance(name, network, next_hop, str(distance)))

            elif op_type == "delete_vrf_static_route":
                if not name or not network:
                    raise HTTPException(status_code=400, detail="delete_vrf_static_route requires 'name' and 'network'")
                delete_commands.append(mapper.get_vrf_static_route(name, network))

            elif op_type == "add_vrf_static_route_blackhole":
                if not name or not network:
                    raise HTTPException(status_code=400, detail="add_vrf_static_route_blackhole requires 'name' and 'network'")
                set_commands.append(mapper.get_vrf_static_route_blackhole(name, network))

            elif op_type == "add_vrf_static_route6":
                if not name or not network or not next_hop:
                    raise HTTPException(status_code=400, detail="add_vrf_static_route6 requires 'name', 'network', and 'next_hop'")
                set_commands.append(mapper.get_vrf_static_route6_next_hop(name, network, next_hop))

            elif op_type == "delete_vrf_static_route6":
                if not name or not network:
                    raise HTTPException(status_code=400, detail="delete_vrf_static_route6 requires 'name' and 'network'")
                delete_commands.append(mapper.get_vrf_static_route6(name, network))

            # ================================================================
            # BGP Operations
            # ================================================================

            elif op_type == "set_vrf_bgp_as":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_as requires 'name' and 'value' (AS number)")
                set_commands.append(mapper.get_vrf_bgp_system_as(name, str(value)))

            elif op_type == "delete_vrf_bgp":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrf_bgp requires 'name'")
                delete_commands.append(["vrf", "name", name, "protocols", "bgp"])

            elif op_type == "set_vrf_bgp_router_id":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_router_id requires 'name' and 'value'")
                set_commands.append(mapper.get_vrf_bgp_router_id(name, value))

            elif op_type == "add_vrf_bgp_neighbor":
                if not name or not neighbor:
                    raise HTTPException(status_code=400, detail="add_vrf_bgp_neighbor requires 'name' and 'neighbor'")
                remote_as = operation.get("remote_as")
                if remote_as:
                    set_commands.append(mapper.get_vrf_bgp_neighbor_remote_as(name, neighbor, str(remote_as)))
                else:
                    set_commands.append(mapper.get_vrf_bgp_neighbor(name, neighbor))

            elif op_type == "delete_vrf_bgp_neighbor":
                if not name or not neighbor:
                    raise HTTPException(status_code=400, detail="delete_vrf_bgp_neighbor requires 'name' and 'neighbor'")
                delete_commands.append(mapper.get_vrf_bgp_neighbor(name, neighbor))

            elif op_type == "add_vrf_bgp_redistribute":
                if not name or not protocol:
                    raise HTTPException(status_code=400, detail="add_vrf_bgp_redistribute requires 'name' and 'protocol'")
                set_commands.append(mapper.get_vrf_bgp_redistribute(name, af, protocol))

            elif op_type == "delete_vrf_bgp_redistribute":
                if not name or not protocol:
                    raise HTTPException(status_code=400, detail="delete_vrf_bgp_redistribute requires 'name' and 'protocol'")
                delete_commands.append(mapper.get_vrf_bgp_redistribute(name, af, protocol))

            elif op_type == "set_vrf_bgp_import_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_import_vrf requires 'name'")
                import_vrf = operation.get("import_vrf")
                if not import_vrf:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_import_vrf requires 'import_vrf'")
                set_commands.append(mapper.get_vrf_bgp_import_vrf(name, af, import_vrf))

            elif op_type == "delete_vrf_bgp_import_vrf":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrf_bgp_import_vrf requires 'name'")
                import_vrf = operation.get("import_vrf")
                if not import_vrf:
                    raise HTTPException(status_code=400, detail="delete_vrf_bgp_import_vrf requires 'import_vrf'")
                delete_commands.append(mapper.get_vrf_bgp_import_vrf(name, af, import_vrf))

            elif op_type == "enable_vrf_bgp_import_vpn":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrf_bgp_import_vpn requires 'name'")
                set_commands.append(mapper.get_vrf_bgp_import_vpn(name, af))

            elif op_type == "enable_vrf_bgp_export_vpn":
                if not name:
                    raise HTTPException(status_code=400, detail="enable_vrf_bgp_export_vpn requires 'name'")
                set_commands.append(mapper.get_vrf_bgp_export_vpn(name, af))

            elif op_type == "set_vrf_bgp_rd_export":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_rd_export requires 'name' and 'value'")
                set_commands.append(mapper.get_vrf_bgp_rd_vpn_export(name, af, value))

            elif op_type == "set_vrf_bgp_route_target":
                if not name or not value:
                    raise HTTPException(status_code=400, detail="set_vrf_bgp_route_target requires 'name' and 'value'")
                direction = operation.get("direction", "both")
                set_commands.append(mapper.get_vrf_bgp_route_target_vpn(name, af, direction, value))

            # ================================================================
            # OSPF Operations
            # ================================================================

            elif op_type == "set_vrf_ospf_area_network":
                if not name or not area or not network:
                    raise HTTPException(status_code=400, detail="set_vrf_ospf_area_network requires 'name', 'area', and 'network'")
                set_commands.append(mapper.get_vrf_ospf_area_network(name, area, network))

            elif op_type == "delete_vrf_ospf_area_network":
                if not name or not area or not network:
                    raise HTTPException(status_code=400, detail="delete_vrf_ospf_area_network requires 'name', 'area', and 'network'")
                delete_commands.append(mapper.get_vrf_ospf_area_network(name, area, network))

            elif op_type == "delete_vrf_ospf":
                if not name:
                    raise HTTPException(status_code=400, detail="delete_vrf_ospf requires 'name'")
                delete_commands.append(mapper.get_vrf_ospf(name))

            elif op_type == "add_vrf_ospf_redistribute":
                if not name or not protocol:
                    raise HTTPException(status_code=400, detail="add_vrf_ospf_redistribute requires 'name' and 'protocol'")
                set_commands.append(mapper.get_vrf_ospf_redistribute(name, protocol))

            elif op_type == "delete_vrf_ospf_redistribute":
                if not name or not protocol:
                    raise HTTPException(status_code=400, detail="delete_vrf_ospf_redistribute requires 'name' and 'protocol'")
                delete_commands.append(mapper.get_vrf_ospf_redistribute(name, protocol))

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {op_type}"
                )

        # Execute delete commands first, then set commands
        response = await run_in_threadpool(
            service.configure_batch,
            set_commands=set_commands,
            delete_commands=delete_commands,
        )

        if response.status != 200:
            return VyOSResponse(
                success=False,
                error=response.error if hasattr(response, 'error') and response.error else "Configuration failed"
            )

        return VyOSResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[VRF Batch Error] {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
