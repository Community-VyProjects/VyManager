"""
Firewall Zones Router

API endpoints for managing zone-based firewall policies.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from session_vyos_service import get_session_vyos_service
from vyos_mappers.firewall.zones import ZonesMapper

router = APIRouter(prefix="/firewall/zones", tags=["firewall"])


# ========================================================================
# Pydantic Models
# ========================================================================


class ZoneFirewallPolicy(BaseModel):
    """Firewall policy reference."""
    ipv4_ruleset: Optional[str] = Field(None, description="IPv4 firewall ruleset name")
    ipv6_ruleset: Optional[str] = Field(None, description="IPv6 firewall ruleset name")


class FromZonePolicy(BaseModel):
    """Policy for traffic from another zone."""
    zone: str = Field(..., description="Source zone name")
    firewall: ZoneFirewallPolicy = Field(default_factory=ZoneFirewallPolicy)


class IntraZoneFiltering(BaseModel):
    """Intra-zone filtering configuration."""
    action: Optional[str] = Field(None, description="Default action (accept/drop)")
    firewall: ZoneFirewallPolicy = Field(default_factory=ZoneFirewallPolicy)


class FirewallZone(BaseModel):
    """Complete zone configuration."""
    name: str = Field(..., min_length=1, max_length=63, description="Zone name")
    description: Optional[str] = Field(None, description="Zone description")
    default_action: Optional[str] = Field(None, description="Default action for zone")
    interfaces: List[str] = Field(default_factory=list, description="Interfaces in this zone")
    from_zones: List[FromZonePolicy] = Field(default_factory=list, description="Policies from other zones")
    intra_zone_filtering: Optional[IntraZoneFiltering] = Field(None, description="Intra-zone filtering")


class ZonesConfig(BaseModel):
    """Complete zones configuration."""
    zones: List[FirewallZone]


class ZonePolicyMatrix(BaseModel):
    """Zone-to-zone policy entry."""
    from_zone: str
    to_zone: str
    ipv4_ruleset: Optional[str] = None
    ipv6_ruleset: Optional[str] = None
    action: Optional[str] = None
    type: str  # "inter-zone" or "intra-zone"


class CreateZoneRequest(BaseModel):
    """Request to create a new zone."""
    name: str = Field(..., min_length=1, max_length=63)
    description: Optional[str] = None
    default_action: Optional[str] = None
    interfaces: List[str] = Field(default_factory=list)
    from_zones: List[FromZonePolicy] = Field(default_factory=list)
    intra_zone_filtering: Optional[IntraZoneFiltering] = None


class UpdateZoneRequest(BaseModel):
    """Request to update a zone."""
    description: Optional[str] = None
    default_action: Optional[str] = None
    interfaces: Optional[List[str]] = None
    from_zones: Optional[List[FromZonePolicy]] = None
    intra_zone_filtering: Optional[IntraZoneFiltering] = None


class AddFromZoneRequest(BaseModel):
    """Request to add a from-zone policy."""
    from_zone: str = Field(..., description="Source zone name")
    ipv4_ruleset: Optional[str] = None
    ipv6_ruleset: Optional[str] = None


class ApiResponse(BaseModel):
    """Standard API response."""
    success: bool
    message: str


# ========================================================================
# Endpoints
# ========================================================================


@router.get("/config", response_model=ZonesConfig)
async def get_zones_config(request: Request):
    """Get complete zone-based firewall configuration."""
    service = get_session_vyos_service(request)

    try:
        config = await run_in_threadpool(service.get_full_config)
        parsed = ZonesMapper.parse_config(config)

        zones = [FirewallZone(**z) for z in parsed["zones"]]
        return ZonesConfig(zones=zones)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/policies", response_model=List[ZonePolicyMatrix])
async def get_zone_policies(request: Request):
    """Get zone-to-zone policy matrix."""
    service = get_session_vyos_service(request)

    try:
        config = await run_in_threadpool(service.get_full_config)
        parsed = ZonesMapper.parse_config(config)
        policies = ZonesMapper.generate_policy_matrix(parsed["zones"])

        return [ZonePolicyMatrix(**p) for p in policies]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{zone_name}", response_model=FirewallZone)
async def get_zone(request: Request, zone_name: str):
    """Get a specific zone configuration."""
    service = get_session_vyos_service(request)

    try:
        config = await run_in_threadpool(service.get_full_config)
        parsed = ZonesMapper.parse_config(config)

        for zone in parsed["zones"]:
            if zone["name"] == zone_name:
                return FirewallZone(**zone)

        raise HTTPException(status_code=404, detail=f"Zone '{zone_name}' not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ApiResponse)
async def create_zone(request: Request, data: CreateZoneRequest):
    """Create a new firewall zone."""
    service = get_session_vyos_service(request)

    try:
        # Check if zone already exists
        config = await run_in_threadpool(service.get_full_config)
        existing_zones = config.get("firewall", {}).get("zone", {})
        if data.name in existing_zones:
            raise HTTPException(status_code=400, detail=f"Zone '{data.name}' already exists")

        zone_dict = data.model_dump()
        commands = ZonesMapper.to_vyos_commands(zone_dict, "set")

        for cmd in commands:
            await run_in_threadpool(service.configure_set, cmd)

        return ApiResponse(success=True, message=f"Zone '{data.name}' created")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{zone_name}", response_model=ApiResponse)
async def update_zone(request: Request, zone_name: str, data: UpdateZoneRequest):
    """Update a firewall zone."""
    service = get_session_vyos_service(request)

    try:
        # Check if zone exists
        config = await run_in_threadpool(service.get_full_config)
        existing_zones = config.get("firewall", {}).get("zone", {})
        if zone_name not in existing_zones:
            raise HTTPException(status_code=404, detail=f"Zone '{zone_name}' not found")

        base = f"firewall zone {zone_name}"
        commands = []

        # Update description
        if data.description is not None:
            if data.description:
                commands.append(f"set {base} description '{data.description}'")
            else:
                commands.append(f"delete {base} description")

        # Update default action
        if data.default_action is not None:
            if data.default_action:
                commands.append(f"set {base} default-action {data.default_action}")
            else:
                commands.append(f"delete {base} default-action")

        # Update interfaces (replace all)
        if data.interfaces is not None:
            commands.append(f"delete {base} interface")
            for iface in data.interfaces:
                commands.append(f"set {base} interface {iface}")

        # Update from-zone policies (replace all)
        if data.from_zones is not None:
            commands.append(f"delete {base} from")
            for from_policy in data.from_zones:
                if from_policy.firewall.ipv4_ruleset:
                    commands.append(
                        f"set {base} from {from_policy.zone} firewall name {from_policy.firewall.ipv4_ruleset}"
                    )
                if from_policy.firewall.ipv6_ruleset:
                    commands.append(
                        f"set {base} from {from_policy.zone} firewall ipv6-name {from_policy.firewall.ipv6_ruleset}"
                    )

        # Update intra-zone filtering
        if data.intra_zone_filtering is not None:
            commands.append(f"delete {base} intra-zone-filtering")
            intra = data.intra_zone_filtering
            if intra.action:
                commands.append(f"set {base} intra-zone-filtering action {intra.action}")
            if intra.firewall.ipv4_ruleset:
                commands.append(
                    f"set {base} intra-zone-filtering firewall name {intra.firewall.ipv4_ruleset}"
                )
            if intra.firewall.ipv6_ruleset:
                commands.append(
                    f"set {base} intra-zone-filtering firewall ipv6-name {intra.firewall.ipv6_ruleset}"
                )

        for cmd in commands:
            await run_in_threadpool(service.configure_set, cmd)

        return ApiResponse(success=True, message=f"Zone '{zone_name}' updated")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{zone_name}", response_model=ApiResponse)
async def delete_zone(request: Request, zone_name: str):
    """Delete a firewall zone."""
    service = get_session_vyos_service(request)

    try:
        # Check if zone exists
        config = await run_in_threadpool(service.get_full_config)
        existing_zones = config.get("firewall", {}).get("zone", {})
        if zone_name not in existing_zones:
            raise HTTPException(status_code=404, detail=f"Zone '{zone_name}' not found")

        await run_in_threadpool(service.configure_set, f"delete firewall zone {zone_name}")

        return ApiResponse(success=True, message=f"Zone '{zone_name}' deleted")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{zone_name}/interfaces/{interface}", response_model=ApiResponse)
async def add_interface_to_zone(request: Request, zone_name: str, interface: str):
    """Add an interface to a zone."""
    service = get_session_vyos_service(request)

    try:
        await run_in_threadpool(
            service.configure_set,
            f"set firewall zone {zone_name} interface {interface}"
        )
        return ApiResponse(success=True, message=f"Interface '{interface}' added to zone '{zone_name}'")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{zone_name}/interfaces/{interface}", response_model=ApiResponse)
async def remove_interface_from_zone(request: Request, zone_name: str, interface: str):
    """Remove an interface from a zone."""
    service = get_session_vyos_service(request)

    try:
        await run_in_threadpool(
            service.configure_set,
            f"delete firewall zone {zone_name} interface {interface}"
        )
        return ApiResponse(success=True, message=f"Interface '{interface}' removed from zone '{zone_name}'")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{zone_name}/from", response_model=ApiResponse)
async def add_from_zone_policy(request: Request, zone_name: str, data: AddFromZoneRequest):
    """Add a from-zone policy."""
    service = get_session_vyos_service(request)

    try:
        base = f"firewall zone {zone_name} from {data.from_zone}"

        if data.ipv4_ruleset:
            await run_in_threadpool(
                service.configure_set,
                f"set {base} firewall name {data.ipv4_ruleset}"
            )
        if data.ipv6_ruleset:
            await run_in_threadpool(
                service.configure_set,
                f"set {base} firewall ipv6-name {data.ipv6_ruleset}"
            )

        return ApiResponse(
            success=True,
            message=f"Policy from '{data.from_zone}' to '{zone_name}' added"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{zone_name}/from/{from_zone}", response_model=ApiResponse)
async def delete_from_zone_policy(request: Request, zone_name: str, from_zone: str):
    """Delete a from-zone policy."""
    service = get_session_vyos_service(request)

    try:
        await run_in_threadpool(
            service.configure_set,
            f"delete firewall zone {zone_name} from {from_zone}"
        )
        return ApiResponse(
            success=True,
            message=f"Policy from '{from_zone}' to '{zone_name}' deleted"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
