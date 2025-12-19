"""
Firewall Groups Router

API endpoints for managing VyOS firewall groups.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import FirewallGroupsBatchBuilder

router = APIRouter(prefix="/vyos/firewall/groups", tags=["firewall-groups"])


# Stub functions for backwards compatibility with app.py
# These are no longer used since we use session-based services
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# Request/Response Models
class GroupBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class GroupBatchRequest(BaseModel):
    """Model for batch group configuration."""
    group_name: str = Field(..., description="Group name (e.g., INTERNAL_NETS)")
    operations: List[GroupBatchOperation] = Field(..., description="List of operations to perform")

    class Config:
        json_schema_extra = {
            "example": {
                "group_name": "INTERNAL_NETS",
                "operations": [
                    {"op": "set_address_group"},
                    {"op": "set_address_group_description", "value": "Internal networks"},
                    {"op": "set_address_group_address", "value": "10.0.0.0/8"},
                    {"op": "set_address_group_address", "value": "192.168.0.0/16"}
                ]
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class FirewallGroup(BaseModel):
    """Firewall group configuration."""
    name: str
    type: str
    description: Optional[str] = None
    members: List[str] = []


class GroupsConfigResponse(BaseModel):
    """Response containing all firewall groups."""
    address_groups: List[FirewallGroup] = []
    ipv6_address_groups: List[FirewallGroup] = []
    network_groups: List[FirewallGroup] = []
    ipv6_network_groups: List[FirewallGroup] = []
    port_groups: List[FirewallGroup] = []
    interface_groups: List[FirewallGroup] = []
    mac_groups: List[FirewallGroup] = []
    domain_groups: List[FirewallGroup] = []
    remote_groups: List[FirewallGroup] = []
    total: int = 0
    by_type: Dict[str, int] = {}


@router.get("/capabilities")
async def get_groups_capabilities(request: Request):
    """
    Get firewall groups capabilities based on device VyOS version.

    Returns feature flags indicating which group types and operations are supported.
    This allows frontends to conditionally enable/disable features based on version.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = FirewallGroupsBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=GroupsConfigResponse)
async def get_groups_config(request: Request, refresh: bool = False):
    """
    Get all firewall group configurations from VyOS.

    Args:
        request: FastAPI request object (contains active session)
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all firewall groups organized by type
    """
    try:
        # Get service from active session
        service = get_session_vyos_service(request)
        full_config = service.get_full_config(refresh=refresh)

        if not full_config or "firewall" not in full_config or "group" not in full_config["firewall"]:
            return GroupsConfigResponse(total=0)

        firewall_groups = full_config["firewall"]["group"]

        # Helper function to parse group members
        def parse_group(group_data: Dict, member_key: str) -> List[str]:
            """Extract members from group data."""
            if not group_data or member_key not in group_data:
                return []

            members_data = group_data[member_key]
            if isinstance(members_data, dict):
                return list(members_data.keys())
            elif isinstance(members_data, list):
                return members_data
            return []

        # Parse each group type
        address_groups = []
        if "address-group" in firewall_groups:
            for name, data in firewall_groups["address-group"].items():
                address_groups.append(FirewallGroup(
                    name=name,
                    type="address-group",
                    description=data.get("description"),
                    members=parse_group(data, "address")
                ))

        ipv6_address_groups = []
        if "ipv6-address-group" in firewall_groups:
            for name, data in firewall_groups["ipv6-address-group"].items():
                ipv6_address_groups.append(FirewallGroup(
                    name=name,
                    type="ipv6-address-group",
                    description=data.get("description"),
                    members=parse_group(data, "address")
                ))

        network_groups = []
        if "network-group" in firewall_groups:
            for name, data in firewall_groups["network-group"].items():
                network_groups.append(FirewallGroup(
                    name=name,
                    type="network-group",
                    description=data.get("description"),
                    members=parse_group(data, "network")
                ))

        ipv6_network_groups = []
        if "ipv6-network-group" in firewall_groups:
            for name, data in firewall_groups["ipv6-network-group"].items():
                ipv6_network_groups.append(FirewallGroup(
                    name=name,
                    type="ipv6-network-group",
                    description=data.get("description"),
                    members=parse_group(data, "network")
                ))

        port_groups = []
        if "port-group" in firewall_groups:
            for name, data in firewall_groups["port-group"].items():
                port_groups.append(FirewallGroup(
                    name=name,
                    type="port-group",
                    description=data.get("description"),
                    members=parse_group(data, "port")
                ))

        interface_groups = []
        if "interface-group" in firewall_groups:
            for name, data in firewall_groups["interface-group"].items():
                interface_groups.append(FirewallGroup(
                    name=name,
                    type="interface-group",
                    description=data.get("description"),
                    members=parse_group(data, "interface")
                ))

        mac_groups = []
        if "mac-group" in firewall_groups:
            for name, data in firewall_groups["mac-group"].items():
                mac_groups.append(FirewallGroup(
                    name=name,
                    type="mac-group",
                    description=data.get("description"),
                    members=parse_group(data, "mac-address")
                ))

        domain_groups = []
        if "domain-group" in firewall_groups:
            for name, data in firewall_groups["domain-group"].items():
                domain_groups.append(FirewallGroup(
                    name=name,
                    type="domain-group",
                    description=data.get("description"),
                    members=parse_group(data, "address")
                ))

        remote_groups = []
        if "remote-group" in firewall_groups:
            for name, data in firewall_groups["remote-group"].items():
                # Remote groups have a single URL, not a list of members
                # Store the URL in members array for consistency
                url = data.get("url", "")
                members = [url] if url else []
                remote_groups.append(FirewallGroup(
                    name=name,
                    type="remote-group",
                    description=data.get("description"),
                    members=members
                ))

        # Calculate totals
        total = (
            len(address_groups) +
            len(ipv6_address_groups) +
            len(network_groups) +
            len(ipv6_network_groups) +
            len(port_groups) +
            len(interface_groups) +
            len(mac_groups) +
            len(domain_groups) +
            len(remote_groups)
        )

        by_type = {
            "address-group": len(address_groups),
            "ipv6-address-group": len(ipv6_address_groups),
            "network-group": len(network_groups),
            "ipv6-network-group": len(ipv6_network_groups),
            "port-group": len(port_groups),
            "interface-group": len(interface_groups),
            "mac-group": len(mac_groups),
            "domain-group": len(domain_groups),
            "remote-group": len(remote_groups)
        }

        return GroupsConfigResponse(
            address_groups=address_groups,
            ipv6_address_groups=ipv6_address_groups,
            network_groups=network_groups,
            ipv6_network_groups=ipv6_network_groups,
            port_groups=port_groups,
            interface_groups=interface_groups,
            mac_groups=mac_groups,
            domain_groups=domain_groups,
            remote_groups=remote_groups,
            total=total,
            by_type=by_type
        )

    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=VyOSResponse)
async def configure_group_batch(http_request: Request, request: GroupBatchRequest):
    """
    Configure firewall group using batch operations.

    This is the main endpoint for configuring firewall groups. All operations
    are version-aware and sent to VyOS in a single batch for efficiency.

    **Address Group Operations (IPv4):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_address_group` | No | Create address group |
    | `delete_address_group` | No | Delete address group |
    | `set_address_group_description` | Yes | Set group description |
    | `delete_address_group_description` | No | Delete group description |
    | `set_address_group_address` | Yes | Add IPv4 address or range (e.g., 10.0.0.1 or 10.0.0.1-10.0.0.10) |
    | `delete_address_group_address` | Yes | Remove IPv4 address or range |

    **IPv6 Address Group Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_ipv6_address_group` | No | Create IPv6 address group |
    | `delete_ipv6_address_group` | No | Delete IPv6 address group |
    | `set_ipv6_address_group_description` | Yes | Set group description |
    | `delete_ipv6_address_group_description` | No | Delete group description |
    | `set_ipv6_address_group_address` | Yes | Add IPv6 address or range |
    | `delete_ipv6_address_group_address` | Yes | Remove IPv6 address or range |

    **Network Group Operations (IPv4):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_network_group` | No | Create network group |
    | `delete_network_group` | No | Delete network group |
    | `set_network_group_description` | Yes | Set group description |
    | `delete_network_group_description` | No | Delete group description |
    | `set_network_group_network` | Yes | Add IPv4 network in CIDR (e.g., 10.0.0.0/24) |
    | `delete_network_group_network` | Yes | Remove IPv4 network |

    **IPv6 Network Group Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_ipv6_network_group` | No | Create IPv6 network group |
    | `delete_ipv6_network_group` | No | Delete IPv6 network group |
    | `set_ipv6_network_group_description` | Yes | Set group description |
    | `delete_ipv6_network_group_description` | No | Delete group description |
    | `set_ipv6_network_group_network` | Yes | Add IPv6 network in CIDR |
    | `delete_ipv6_network_group_network` | Yes | Remove IPv6 network |

    **Port Group Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_port_group` | No | Create port group |
    | `delete_port_group` | No | Delete port group |
    | `set_port_group_description` | Yes | Set group description |
    | `delete_port_group_description` | No | Delete group description |
    | `set_port_group_port` | Yes | Add port (number, range, or name: 80, 8000-8100, http) |
    | `delete_port_group_port` | Yes | Remove port |

    **Interface Group Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_interface_group` | No | Create interface group |
    | `delete_interface_group` | No | Delete interface group |
    | `set_interface_group_description` | Yes | Set group description |
    | `delete_interface_group_description` | No | Delete group description |
    | `set_interface_group_interface` | Yes | Add interface name (e.g., eth0, eth1.100) |
    | `delete_interface_group_interface` | Yes | Remove interface name |

    **MAC Group Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_mac_group` | No | Create MAC address group |
    | `delete_mac_group` | No | Delete MAC address group |
    | `set_mac_group_description` | Yes | Set group description |
    | `delete_mac_group_description` | No | Delete group description |
    | `set_mac_group_mac` | Yes | Add MAC address (e.g., 00:11:22:33:44:55) |
    | `delete_mac_group_mac` | Yes | Remove MAC address |

    **Domain Group Operations (VyOS 1.5+ only):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_domain_group` | No | Create domain name group |
    | `delete_domain_group` | No | Delete domain name group |
    | `set_domain_group_description` | Yes | Set group description |
    | `delete_domain_group_description` | No | Delete group description |
    | `set_domain_group_address` | Yes | Add domain name (e.g., example.com) |
    | `delete_domain_group_address` | Yes | Remove domain name |

    **Remote Group Operations (VyOS 1.5+ only):**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_remote_group` | No | Create remote address group |
    | `delete_remote_group` | No | Delete remote address group |
    | `set_remote_group_description` | Yes | Set group description |
    | `delete_remote_group_description` | No | Delete group description |
    | `set_remote_group_url` | Yes | Set URL for remote address list (http/https) |
    | `delete_remote_group_url` | No | Delete URL from remote group |

    **Example:**
    ```json
    {
        "group_name": "INTERNAL_NETS",
        "operations": [
            {"op": "set_network_group"},
            {"op": "set_network_group_description", "value": "Internal networks"},
            {"op": "set_network_group_network", "value": "10.0.0.0/8"},
            {"op": "set_network_group_network", "value": "192.168.0.0/16"}
        ]
    }
    ```
    """
    try:
        service = get_session_vyos_service(http_request)
        batch = service.create_firewall_groups_batch()

        # Process each operation
        for operation in request.operations:
            op_type = operation.op
            value = operation.value

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # Map operation to batch method - Address Group
            if op_type == "set_address_group":
                batch.set_address_group(request.group_name)
            elif op_type == "delete_address_group":
                batch.delete_address_group(request.group_name)
            elif op_type == "set_address_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_address_group_description(request.group_name, value)
            elif op_type == "delete_address_group_description":
                batch.delete_address_group_description(request.group_name)
            elif op_type == "set_address_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_address_group_address(request.group_name, value)
            elif op_type == "delete_address_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_address_group_address(request.group_name, value)

            # IPv6 Address Group
            elif op_type == "set_ipv6_address_group":
                batch.set_ipv6_address_group(request.group_name)
            elif op_type == "delete_ipv6_address_group":
                batch.delete_ipv6_address_group(request.group_name)
            elif op_type == "set_ipv6_address_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_address_group_description(request.group_name, value)
            elif op_type == "delete_ipv6_address_group_description":
                batch.delete_ipv6_address_group_description(request.group_name)
            elif op_type == "set_ipv6_address_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_address_group_address(request.group_name, value)
            elif op_type == "delete_ipv6_address_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_ipv6_address_group_address(request.group_name, value)

            # Network Group
            elif op_type == "set_network_group":
                batch.set_network_group(request.group_name)
            elif op_type == "delete_network_group":
                batch.delete_network_group(request.group_name)
            elif op_type == "set_network_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_network_group_description(request.group_name, value)
            elif op_type == "delete_network_group_description":
                batch.delete_network_group_description(request.group_name)
            elif op_type == "set_network_group_network":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_network_group_network(request.group_name, value)
            elif op_type == "delete_network_group_network":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_network_group_network(request.group_name, value)

            # IPv6 Network Group
            elif op_type == "set_ipv6_network_group":
                batch.set_ipv6_network_group(request.group_name)
            elif op_type == "delete_ipv6_network_group":
                batch.delete_ipv6_network_group(request.group_name)
            elif op_type == "set_ipv6_network_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_network_group_description(request.group_name, value)
            elif op_type == "delete_ipv6_network_group_description":
                batch.delete_ipv6_network_group_description(request.group_name)
            elif op_type == "set_ipv6_network_group_network":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_network_group_network(request.group_name, value)
            elif op_type == "delete_ipv6_network_group_network":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_ipv6_network_group_network(request.group_name, value)

            # Port Group
            elif op_type == "set_port_group":
                batch.set_port_group(request.group_name)
            elif op_type == "delete_port_group":
                batch.delete_port_group(request.group_name)
            elif op_type == "set_port_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_port_group_description(request.group_name, value)
            elif op_type == "delete_port_group_description":
                batch.delete_port_group_description(request.group_name)
            elif op_type == "set_port_group_port":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_port_group_port(request.group_name, value)
            elif op_type == "delete_port_group_port":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_port_group_port(request.group_name, value)

            # Interface Group
            elif op_type == "set_interface_group":
                batch.set_interface_group(request.group_name)
            elif op_type == "delete_interface_group":
                batch.delete_interface_group(request.group_name)
            elif op_type == "set_interface_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_group_description(request.group_name, value)
            elif op_type == "delete_interface_group_description":
                batch.delete_interface_group_description(request.group_name)
            elif op_type == "set_interface_group_interface":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_group_interface(request.group_name, value)
            elif op_type == "delete_interface_group_interface":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_group_interface(request.group_name, value)

            # MAC Group
            elif op_type == "set_mac_group":
                batch.set_mac_group(request.group_name)
            elif op_type == "delete_mac_group":
                batch.delete_mac_group(request.group_name)
            elif op_type == "set_mac_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_mac_group_description(request.group_name, value)
            elif op_type == "delete_mac_group_description":
                batch.delete_mac_group_description(request.group_name)
            elif op_type == "set_mac_group_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_mac_group_mac(request.group_name, value)
            elif op_type == "delete_mac_group_mac":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_mac_group_mac(request.group_name, value)

            # Domain Group (VyOS 1.5+ only)
            elif op_type == "set_domain_group":
                batch.set_domain_group(request.group_name)
            elif op_type == "delete_domain_group":
                batch.delete_domain_group(request.group_name)
            elif op_type == "set_domain_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_domain_group_description(request.group_name, value)
            elif op_type == "delete_domain_group_description":
                batch.delete_domain_group_description(request.group_name)
            elif op_type == "set_domain_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_domain_group_address(request.group_name, value)
            elif op_type == "delete_domain_group_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_domain_group_address(request.group_name, value)

            # Remote Group
            elif op_type == "set_remote_group":
                batch.set_remote_group(request.group_name)
            elif op_type == "delete_remote_group":
                batch.delete_remote_group(request.group_name)
            elif op_type == "set_remote_group_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_remote_group_description(request.group_name, value)
            elif op_type == "delete_remote_group_description":
                batch.delete_remote_group_description(request.group_name)
            elif op_type == "set_remote_group_url":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_remote_group_url(request.group_name, value)
            elif op_type == "delete_remote_group_url":
                # URL value is required for deletion
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_remote_group_url(request.group_name, value)

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # Execute the batch
        response = service.execute_batch(batch)

        # Handle empty string result (convert to None for Pydantic validation)
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = None
        elif not isinstance(result_data, dict):
            # If it's not a dict and not empty, wrap it
            result_data = {"result": result_data}

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
