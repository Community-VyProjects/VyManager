"""
OSPF Protocol Configuration Endpoints

All OSPF (Open Shortest Path First) configuration endpoints for VyOS.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

# Router for OSPF protocol endpoints
router = APIRouter(prefix="/vyos/ospf", tags=["ospf-protocol"])


# ============================================================================
# Request Models (for WRITE operations)
# ============================================================================


class OSPFBatchRequest(BaseModel):
    """Model for batch OSPF configuration."""

    operations: List[Dict[str, Any]] = Field(
        ...,
        description="List of OSPF operations",
        json_schema_extra={
            "example": [
                {"op": "set_router_id", "value": "10.0.0.1"},
                {"op": "add_area_network", "area": "0.0.0.0", "network": "10.0.0.0/24"},
                {"op": "add_interface", "interface": "eth0", "area": "0.0.0.0"}
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


class OSPFAreaRange(BaseModel):
    """OSPF area range configuration."""
    prefix: str
    cost: Optional[str] = None
    not_advertise: bool = False


class OSPFArea(BaseModel):
    """OSPF area configuration."""
    id: str
    type: str = "normal"
    networks: List[str] = Field(default_factory=list)
    ranges: List[OSPFAreaRange] = Field(default_factory=list)
    virtual_links: List[str] = Field(default_factory=list)


class OSPFAuthentication(BaseModel):
    """OSPF interface authentication."""
    type: str
    key_id: Optional[List[str]] = None


class OSPFInterface(BaseModel):
    """OSPF interface configuration."""
    name: str
    area: Optional[str] = None
    cost: Optional[str] = None
    priority: Optional[str] = None
    hello_interval: Optional[str] = None
    dead_interval: Optional[str] = None
    retransmit_interval: Optional[str] = None
    transmit_delay: Optional[str] = None
    network: Optional[str] = None
    passive: bool = False
    mtu_ignore: bool = False
    bfd: bool = False
    authentication: Optional[OSPFAuthentication] = None


class OSPFRedistribution(BaseModel):
    """OSPF redistribution configuration."""
    protocol: str
    route_map: Optional[str] = None
    metric: Optional[str] = None
    metric_type: Optional[str] = None


class OSPFPassiveInterfaces(BaseModel):
    """OSPF passive interface configuration."""
    default: bool = False
    interfaces: List[str] = Field(default_factory=list)


class OSPFDefaultInformation(BaseModel):
    """OSPF default information originate configuration."""
    originate: bool = False
    always: bool = False
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    route_map: Optional[str] = None


class OSPFConfigResponse(BaseModel):
    """Full OSPF configuration response."""

    configured: bool = False
    router_id: Optional[str] = None
    abr_type: Optional[str] = None
    rfc1583_compatibility: bool = False
    opaque_lsa: bool = False
    areas: List[OSPFArea] = Field(default_factory=list)
    interfaces: List[OSPFInterface] = Field(default_factory=list)
    redistributions: List[OSPFRedistribution] = Field(default_factory=list)
    passive_interfaces: OSPFPassiveInterfaces = Field(default_factory=OSPFPassiveInterfaces)
    default_information: OSPFDefaultInformation = Field(default_factory=OSPFDefaultInformation)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "configured": True,
                "router_id": "10.0.0.1",
                "areas": [
                    {
                        "id": "0.0.0.0",
                        "type": "normal",
                        "networks": ["10.0.0.0/24"]
                    }
                ],
                "interfaces": [
                    {
                        "name": "eth0",
                        "area": "0.0.0.0",
                        "cost": "10"
                    }
                ]
            }
        }
    )


# ============================================================================
# READ Operations (GET)
# ============================================================================


@router.get("/config", response_model=OSPFConfigResponse)
async def get_ospf_config(http_request: Request) -> OSPFConfigResponse:
    """
    Get full OSPF configuration from VyOS.

    Returns configuration details including router ID, areas, interfaces, etc.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.ospf import OSPFMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("protocols", {}).get("ospf", {})

        mapper = OSPFMapper(service.get_version())
        parsed_data = mapper.parse_ospf_config(raw_config)

        return OSPFConfigResponse(**parsed_data)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capabilities")
async def get_ospf_capabilities(http_request: Request) -> Dict[str, Any]:
    """
    Get OSPF capabilities for the connected VyOS version.

    Returns supported area types, network types, and other options.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        area_types = [
            {"value": "normal", "label": "Normal", "description": "Standard OSPF area"},
            {"value": "stub", "label": "Stub", "description": "Stub area (no external LSAs)"},
            {"value": "totally-stubby", "label": "Totally Stubby", "description": "No external or inter-area LSAs"},
            {"value": "nssa", "label": "NSSA", "description": "Not-so-stubby area"},
            {"value": "nssa-totally-stubby", "label": "NSSA Totally Stubby", "description": "NSSA with no inter-area LSAs"},
        ]

        network_types = [
            {"value": "broadcast", "label": "Broadcast", "description": "Standard broadcast network"},
            {"value": "point-to-point", "label": "Point-to-Point", "description": "Point-to-point link"},
            {"value": "point-to-multipoint", "label": "Point-to-Multipoint", "description": "Point-to-multipoint network"},
            {"value": "non-broadcast", "label": "Non-Broadcast", "description": "NBMA network"},
        ]

        redistribute_protocols = [
            {"value": "bgp", "label": "BGP", "description": "BGP routes"},
            {"value": "connected", "label": "Connected", "description": "Directly connected routes"},
            {"value": "kernel", "label": "Kernel", "description": "Kernel routes"},
            {"value": "rip", "label": "RIP", "description": "RIP routes"},
            {"value": "static", "label": "Static", "description": "Static routes"},
        ]

        return {
            "area_types": area_types,
            "network_types": network_types,
            "redistribute_protocols": redistribute_protocols,
            "default_timers": {
                "hello_interval": 10,
                "dead_interval": 40,
                "retransmit_interval": 5,
            },
            "version": version,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/neighbors")
async def get_ospf_neighbors(http_request: Request) -> Dict[str, Any]:
    """
    Get OSPF neighbor states from VyOS.

    Returns neighbor states similar to 'show ip ospf neighbor'.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.execute_show_command,
            ["show", "ip", "ospf", "neighbor"]
        )

        return {
            "success": True,
            "data": response if response else {},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database")
async def get_ospf_database(http_request: Request) -> Dict[str, Any]:
    """
    Get OSPF database summary from VyOS.

    Returns LSA database information.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTING)

    try:
        service = get_session_vyos_service(http_request)

        response = await run_in_threadpool(
            service.execute_show_command,
            ["show", "ip", "ospf", "database"]
        )

        return {
            "success": True,
            "data": response if response else {},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# WRITE Operations (POST)
# ============================================================================


@router.post("/batch")
async def configure_ospf_batch(http_request: Request, request: OSPFBatchRequest) -> VyOSResponse:
    """
    Configure OSPF using batch operations.

    **Supported Operations:**

    | Operation | Required Params | Description |
    |-----------|-----------------|-------------|
    | `set_router_id` | value | Set OSPF router ID |
    | `delete_router_id` | - | Remove router ID |
    | `set_abr_type` | value | Set ABR type |
    | `enable_rfc1583` | - | Enable RFC 1583 compatibility |
    | `disable_rfc1583` | - | Disable RFC 1583 compatibility |
    | `add_area` | area | Create an area |
    | `delete_area` | area | Delete an area |
    | `add_area_network` | area, network | Add network to area |
    | `delete_area_network` | area, network | Remove network from area |
    | `set_area_type_stub` | area | Set area as stub |
    | `set_area_type_nssa` | area | Set area as NSSA |
    | `set_area_type_normal` | area | Set area as normal |
    | `add_interface` | interface, area | Add interface to OSPF |
    | `delete_interface` | interface | Remove interface from OSPF |
    | `set_interface_cost` | interface, value | Set interface cost |
    | `set_interface_priority` | interface, value | Set interface priority |
    | `set_interface_timers` | interface, hello, dead | Set interface timers |
    | `set_interface_network` | interface, value | Set interface network type |
    | `enable_interface_passive` | interface | Make interface passive |
    | `disable_interface_passive` | interface | Make interface active |
    | `enable_interface_bfd` | interface | Enable BFD |
    | `disable_interface_bfd` | interface | Disable BFD |
    | `add_redistribute` | protocol | Redistribute protocol |
    | `delete_redistribute` | protocol | Remove redistribution |
    | `enable_default_originate` | - | Enable default originate |
    | `disable_default_originate` | - | Disable default originate |
    | `delete_ospf` | - | Delete entire OSPF configuration |

    **Example Request:**
    ```json
    {
        "operations": [
            {"op": "set_router_id", "value": "10.0.0.1"},
            {"op": "add_area_network", "area": "0.0.0.0", "network": "10.0.0.0/24"},
            {"op": "add_interface", "interface": "eth0", "area": "0.0.0.0"},
            {"op": "set_interface_cost", "interface": "eth0", "value": "10"}
        ]
    }
    ```
    """
    await require_write_permission(http_request, FeatureGroup.ROUTING)

    from vyos_mappers.protocols.ospf import OSPFMapper

    try:
        service = get_session_vyos_service(http_request)
        mapper = OSPFMapper(service.get_version())

        set_commands = []
        delete_commands = []

        for operation in request.operations:
            op_type = operation.get("op")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Basic OSPF operations
            if op_type == "set_router_id":
                value = operation.get("value")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_router_id(value))

            elif op_type == "delete_router_id":
                delete_commands.append(mapper.get_router_id_path())

            elif op_type == "set_abr_type":
                value = operation.get("value")
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                set_commands.append(mapper.get_abr_type(value))

            elif op_type == "delete_abr_type":
                delete_commands.append(mapper.get_abr_type_path())

            elif op_type == "enable_rfc1583":
                set_commands.append(mapper.get_rfc1583_compatibility())

            elif op_type == "disable_rfc1583":
                delete_commands.append(mapper.get_rfc1583_compatibility())

            elif op_type == "enable_opaque_lsa":
                set_commands.append(mapper.get_opaque_lsa())

            elif op_type == "disable_opaque_lsa":
                delete_commands.append(mapper.get_opaque_lsa())

            # Area operations
            elif op_type == "add_area":
                area = operation.get("area")
                if not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area")
                set_commands.append(mapper.get_area(area))

            elif op_type == "delete_area":
                area = operation.get("area")
                if not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area")
                delete_commands.append(mapper.get_area(area))

            elif op_type == "add_area_network":
                area = operation.get("area")
                network = operation.get("network")
                if not area or not network:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and network")
                set_commands.append(mapper.get_area_network(area, network))

            elif op_type == "delete_area_network":
                area = operation.get("area")
                network = operation.get("network")
                if not area or not network:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and network")
                delete_commands.append(mapper.get_area_network(area, network))

            elif op_type == "add_area_range":
                area = operation.get("area")
                prefix = operation.get("prefix")
                if not area or not prefix:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and prefix")
                set_commands.append(mapper.get_area_range(area, prefix))
                cost = operation.get("cost")
                if cost:
                    set_commands.append(mapper.get_area_range_cost(area, prefix, str(cost)))
                if operation.get("not_advertise"):
                    set_commands.append(mapper.get_area_range_not_advertise(area, prefix))

            elif op_type == "delete_area_range":
                area = operation.get("area")
                prefix = operation.get("prefix")
                if not area or not prefix:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and prefix")
                delete_commands.append(mapper.get_area_range(area, prefix))

            elif op_type == "set_area_type_stub":
                area = operation.get("area")
                if not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area")
                set_commands.append(mapper.get_area_type_stub(area))
                if operation.get("no_summary"):
                    set_commands.append(mapper.get_area_type_stub_no_summary(area))
                default_cost = operation.get("default_cost")
                if default_cost:
                    set_commands.append(mapper.get_area_type_stub_default_cost(area, str(default_cost)))

            elif op_type == "set_area_type_nssa":
                area = operation.get("area")
                if not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area")
                set_commands.append(mapper.get_area_type_nssa(area))
                if operation.get("no_summary"):
                    set_commands.append(mapper.get_area_type_nssa_no_summary(area))
                default_cost = operation.get("default_cost")
                if default_cost:
                    set_commands.append(mapper.get_area_type_nssa_default_cost(area, str(default_cost)))

            elif op_type == "set_area_type_normal":
                area = operation.get("area")
                if not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area")
                set_commands.append(mapper.get_area_type_normal(area))

            elif op_type == "add_area_virtual_link":
                area = operation.get("area")
                router_id = operation.get("router_id")
                if not area or not router_id:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and router_id")
                set_commands.append(mapper.get_area_virtual_link(area, router_id))

            elif op_type == "delete_area_virtual_link":
                area = operation.get("area")
                router_id = operation.get("router_id")
                if not area or not router_id:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires area and router_id")
                delete_commands.append(mapper.get_area_virtual_link(area, router_id))

            # Interface operations
            elif op_type == "add_interface":
                interface = operation.get("interface")
                area = operation.get("area")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                set_commands.append(mapper.get_interface(interface))
                if area:
                    set_commands.append(mapper.get_interface_area(interface, area))

            elif op_type == "delete_interface":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface(interface))

            elif op_type == "set_interface_area":
                interface = operation.get("interface")
                area = operation.get("area")
                if not interface or not area:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface and area")
                set_commands.append(mapper.get_interface_area(interface, area))

            elif op_type == "set_interface_cost":
                interface = operation.get("interface")
                value = operation.get("value")
                if not interface or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface and value")
                set_commands.append(mapper.get_interface_cost(interface, str(value)))

            elif op_type == "delete_interface_cost":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_cost_path(interface))

            elif op_type == "set_interface_priority":
                interface = operation.get("interface")
                value = operation.get("value")
                if not interface or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface and value")
                set_commands.append(mapper.get_interface_priority(interface, str(value)))

            elif op_type == "delete_interface_priority":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_priority_path(interface))

            elif op_type == "set_interface_timers":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                hello = operation.get("hello")
                dead = operation.get("dead")
                retransmit = operation.get("retransmit")
                transmit_delay = operation.get("transmit_delay")
                if hello:
                    set_commands.append(mapper.get_interface_hello_interval(interface, str(hello)))
                if dead:
                    set_commands.append(mapper.get_interface_dead_interval(interface, str(dead)))
                if retransmit:
                    set_commands.append(mapper.get_interface_retransmit_interval(interface, str(retransmit)))
                if transmit_delay:
                    set_commands.append(mapper.get_interface_transmit_delay(interface, str(transmit_delay)))

            elif op_type == "set_interface_network":
                interface = operation.get("interface")
                value = operation.get("value")
                if not interface or not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface and value")
                set_commands.append(mapper.get_interface_network(interface, value))

            elif op_type == "delete_interface_network":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_network_path(interface))

            elif op_type == "enable_interface_passive":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                set_commands.append(mapper.get_interface_passive(interface))

            elif op_type == "disable_interface_passive":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_passive(interface))

            elif op_type == "enable_interface_mtu_ignore":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                set_commands.append(mapper.get_interface_mtu_ignore(interface))

            elif op_type == "disable_interface_mtu_ignore":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_mtu_ignore(interface))

            elif op_type == "enable_interface_bfd":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                set_commands.append(mapper.get_interface_bfd(interface))

            elif op_type == "disable_interface_bfd":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_interface_bfd(interface))

            # Passive interface operations
            elif op_type == "enable_passive_interface_default":
                set_commands.append(mapper.get_passive_interface_default())

            elif op_type == "disable_passive_interface_default":
                delete_commands.append(mapper.get_passive_interface_default())

            elif op_type == "add_passive_interface":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                set_commands.append(mapper.get_passive_interface(interface))

            elif op_type == "remove_passive_interface":
                interface = operation.get("interface")
                if not interface:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires interface")
                delete_commands.append(mapper.get_passive_interface(interface))

            # Redistribution operations
            elif op_type == "add_redistribute":
                protocol = operation.get("protocol")
                if not protocol:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires protocol")
                set_commands.append(mapper.get_redistribute(protocol))
                route_map = operation.get("route_map")
                if route_map:
                    set_commands.append(mapper.get_redistribute_route_map(protocol, route_map))
                metric = operation.get("metric")
                if metric:
                    set_commands.append(mapper.get_redistribute_metric(protocol, str(metric)))
                metric_type = operation.get("metric_type")
                if metric_type:
                    set_commands.append(mapper.get_redistribute_metric_type(protocol, str(metric_type)))

            elif op_type == "delete_redistribute":
                protocol = operation.get("protocol")
                if not protocol:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires protocol")
                delete_commands.append(mapper.get_redistribute(protocol))

            # Default information operations
            elif op_type == "enable_default_originate":
                set_commands.append(mapper.get_default_information_originate())
                if operation.get("always"):
                    set_commands.append(mapper.get_default_information_originate_always())
                metric = operation.get("metric")
                if metric:
                    set_commands.append(mapper.get_default_information_originate_metric(str(metric)))
                metric_type = operation.get("metric_type")
                if metric_type:
                    set_commands.append(mapper.get_default_information_originate_metric_type(str(metric_type)))
                route_map = operation.get("route_map")
                if route_map:
                    set_commands.append(mapper.get_default_information_originate_route_map(route_map))

            elif op_type == "disable_default_originate":
                delete_commands.append(mapper.get_default_information_originate())

            # SPF timers
            elif op_type == "set_spf_timers":
                delay = operation.get("delay")
                initial_holdtime = operation.get("initial_holdtime")
                max_holdtime = operation.get("max_holdtime")
                if delay:
                    set_commands.append(mapper.get_timers_throttle_spf_delay(str(delay)))
                if initial_holdtime:
                    set_commands.append(mapper.get_timers_throttle_spf_initial_holdtime(str(initial_holdtime)))
                if max_holdtime:
                    set_commands.append(mapper.get_timers_throttle_spf_max_holdtime(str(max_holdtime)))

            # Delete entire OSPF configuration
            elif op_type == "delete_ospf":
                delete_commands.append(mapper.get_ospf())

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
