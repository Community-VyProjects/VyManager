"""
Firewall Groups Router

API endpoints for managing VyOS firewall groups.
Supports version-aware configuration for VyOS 1.4 and 1.5.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.firewall import FirewallGroupsBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission, FeatureGroup
import inspect
import logging
from batch_dispatch import resolve_batch_method
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/groups", tags=["firewall-groups"])


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
    included_groups: List[str] = []


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

    Requires READ permission on FIREWALL_GROUPS feature.
    """
    # Check user has READ permission for firewall groups
    await require_read_permission(request, FeatureGroup.FIREWALL_GROUPS)

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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=GroupsConfigResponse)
async def get_groups_config(request: Request, refresh: bool = False):
    """
    Get all firewall group configurations from VyOS.

    Args:
        request: FastAPI request object (contains active session)
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all firewall groups organized by type

    Requires READ permission on FIREWALL_GROUPS feature.
    """
    # Check user has READ permission for firewall groups
    await require_read_permission(request, FeatureGroup.FIREWALL_GROUPS)

    try:
        # Get service from active session
        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

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

        # Helper function to parse included groups
        def parse_included_groups(group_data: Dict) -> List[str]:
            """Extract included groups from group data."""
            if not group_data or "include" not in group_data:
                return []

            include_data = group_data["include"]
            # VyOS returns a string for single include, list for multiple
            if isinstance(include_data, str):
                return [include_data]
            elif isinstance(include_data, list):
                return include_data
            elif isinstance(include_data, dict):
                return list(include_data.keys())
            return []

        # Parse each group type
        address_groups = []
        if "address-group" in firewall_groups:
            for name, data in firewall_groups["address-group"].items():
                address_groups.append(FirewallGroup(
                    name=name,
                    type="address-group",
                    description=data.get("description"),
                    members=parse_group(data, "address"),
                    included_groups=parse_included_groups(data)
                ))

        ipv6_address_groups = []
        if "ipv6-address-group" in firewall_groups:
            for name, data in firewall_groups["ipv6-address-group"].items():
                ipv6_address_groups.append(FirewallGroup(
                    name=name,
                    type="ipv6-address-group",
                    description=data.get("description"),
                    members=parse_group(data, "address"),
                    included_groups=parse_included_groups(data)
                ))

        network_groups = []
        if "network-group" in firewall_groups:
            for name, data in firewall_groups["network-group"].items():
                network_groups.append(FirewallGroup(
                    name=name,
                    type="network-group",
                    description=data.get("description"),
                    members=parse_group(data, "network"),
                    included_groups=parse_included_groups(data)
                ))

        ipv6_network_groups = []
        if "ipv6-network-group" in firewall_groups:
            for name, data in firewall_groups["ipv6-network-group"].items():
                ipv6_network_groups.append(FirewallGroup(
                    name=name,
                    type="ipv6-network-group",
                    description=data.get("description"),
                    members=parse_group(data, "network"),
                    included_groups=parse_included_groups(data)
                ))

        port_groups = []
        if "port-group" in firewall_groups:
            for name, data in firewall_groups["port-group"].items():
                port_groups.append(FirewallGroup(
                    name=name,
                    type="port-group",
                    description=data.get("description"),
                    members=parse_group(data, "port"),
                    included_groups=parse_included_groups(data)
                ))

        interface_groups = []
        if "interface-group" in firewall_groups:
            for name, data in firewall_groups["interface-group"].items():
                interface_groups.append(FirewallGroup(
                    name=name,
                    type="interface-group",
                    description=data.get("description"),
                    members=parse_group(data, "interface"),
                    included_groups=parse_included_groups(data)
                ))

        mac_groups = []
        if "mac-group" in firewall_groups:
            for name, data in firewall_groups["mac-group"].items():
                mac_groups.append(FirewallGroup(
                    name=name,
                    type="mac-group",
                    description=data.get("description"),
                    members=parse_group(data, "mac-address"),
                    included_groups=parse_included_groups(data)
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def configure_group_batch(http_request: Request, request: GroupBatchRequest):
    """
    Configure one firewall group in a single VyOS commit.

    Each operation names a FirewallGroupsBatchBuilder method. Every method
    takes the group name; a method with a second argument (a description, a
    member, an included group) also requires `value`.

    Requires WRITE permission on FIREWALL_GROUPS feature.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_GROUPS)

    try:
        service = get_session_vyos_service(http_request)
        batch = FirewallGroupsBatchBuilder(version=service.get_version())

        try:
            for operation in request.operations:
                method = resolve_batch_method(batch, operation.op)
                if len(inspect.signature(method).parameters) == 1:
                    method(request.group_name)
                    continue
                if not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"{operation.op} requires a value",
                    )
                method(request.group_name, operation.value)
        except ValueError as e:
            # The mapper raises ValueError for a group type this version lacks.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, batch)

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

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
