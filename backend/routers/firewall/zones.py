"""
Firewall Zones Router

API endpoints for managing VyOS firewall zone configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

VyOS 1.4 vs 1.5 differences:
- Interfaces: 1.4 uses `interface` at zone level; 1.5 uses `member interface` / `member vrf`
- Default firewall: 1.5 adds `default-firewall name/ipv6-name`
"""

import logging
from typing import Any, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from session_vyos_service import get_session_vyos_service
from vyos_builders.firewall import (
    FirewallZonesBatchBuilder,
    FirewallIPv4BatchBuilder,
    FirewallIPv6BatchBuilder,
)
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.firewall import FirewallZonesMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import call_item_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/zones", tags=["firewall-zones"])

# Builder ops that split "from_zone:chain_name" themselves.
COMPOSITE_OPS = frozenset({"set_zone_from_ipv4", "set_zone_from_ipv6"})

# The local zone /provision creates for the first zone and /deprovision
# removes with the last one.
LOCAL_ZONE = "LOCAL"


def _zone_name_not_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("zone_name must not be blank")
    return value


def _names_not_blank_or_repeated(values: List[str]) -> List[str]:
    if any(not value.strip() for value in values):
        raise ValueError("names must not be blank")
    if len(set(values)) != len(values):
        raise ValueError("names must not repeat")
    return values


def _not_local_or_self(zone_name: str, peers: List[str]) -> None:
    """Pair chains and from-zone refs are built from these names."""
    if zone_name == LOCAL_ZONE:
        raise ValueError(f"zone_name must not be {LOCAL_ZONE}")
    if zone_name in peers or LOCAL_ZONE in peers:
        raise ValueError(f"peer zones must not include the zone itself or {LOCAL_ZONE}")


def _composite_ok(value: str) -> bool:
    """A "from_zone:chain_name" value with both names present and unpadded."""
    from_zone, sep, chain = value.partition(":")
    return bool(
        sep
        and from_zone
        and chain
        and from_zone == from_zone.strip()
        and chain == chain.strip()
        and ":" not in chain
    )


# ============================================================================
# Request / Response Models
# ============================================================================

class ZoneBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name matching a builder method")
    value: Optional[str] = Field(None, description="Optional value for the operation")


class ZoneBatchRequest(BaseModel):
    """Batch firewall zone configuration request."""
    zone_name: str = Field(..., description="Zone name (e.g., LAN, WAN, DMZ)")
    operations: List[ZoneBatchOperation] = Field(
        ..., description="List of operations to perform atomically"
    )

    _zone_name = field_validator("zone_name")(_zone_name_not_blank)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zone_name": "LAN",
                "operations": [
                    {"op": "set_zone"},
                    {"op": "set_zone_description", "value": "Internal LAN zone"},
                    {"op": "set_zone_default_action", "value": "drop"},
                    {"op": "set_zone_interface", "value": "eth1"},
                    {"op": "set_zone_from_firewall_name", "value": "WAN:WAN-LAN"},
                ],
            }
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ZoneProvisionRequest(BaseModel):
    """Request to atomically provision a new zone with chains and policies."""
    zone_name: str = Field(..., description="New zone name")
    description: Optional[str] = Field(None)
    default_action: Literal["drop", "reject"] = Field("drop")
    default_log: bool = Field(False)
    interfaces: List[str] = Field(default_factory=list)
    vrfs: List[str] = Field(default_factory=list)
    existing_zones: List[str] = Field(
        default_factory=list,
        description="Names of existing non-local zones to create chains with"
    )
    is_first_zone: bool = Field(
        False,
        description="When True, also create the LOCAL zone and LOCAL-zone chains"
    )

    _zone_name = field_validator("zone_name")(_zone_name_not_blank)
    _names = field_validator("interfaces", "vrfs", "existing_zones")(_names_not_blank_or_repeated)

    @model_validator(mode="after")
    def _peers(self) -> "ZoneProvisionRequest":
        _not_local_or_self(self.zone_name, self.existing_zones)
        return self


class ZoneDeprovisionRequest(BaseModel):
    """Request to atomically remove a zone and all its chains/policies."""
    zone_name: str = Field(..., description="Zone to delete")
    peer_zones: List[str] = Field(
        default_factory=list,
        description="Names of remaining non-local zones (to clean up from-zone refs)"
    )
    is_last_zone: bool = Field(
        False,
        description="When True, also delete the LOCAL zone and LOCAL-zone chains"
    )

    _zone_name = field_validator("zone_name")(_zone_name_not_blank)
    _names = field_validator("peer_zones")(_names_not_blank_or_repeated)

    @model_validator(mode="after")
    def _peers(self) -> "ZoneDeprovisionRequest":
        _not_local_or_self(self.zone_name, self.peer_zones)
        return self


class ZoneFromPolicy(BaseModel):
    """Rulesets applied to traffic arriving from another zone."""
    from_zone: str
    firewall_name: Optional[str] = None
    firewall_ipv6_name: Optional[str] = None


class ZoneIntraFiltering(BaseModel):
    """Intra-zone filtering."""
    action: Optional[str] = None
    firewall_name: Optional[str] = None
    firewall_ipv6_name: Optional[str] = None


class ZoneDefaultFirewall(BaseModel):
    """Rulesets applied to default-action traffic."""
    name: Optional[str] = None
    ipv6_name: Optional[str] = None


class FirewallZone(BaseModel):
    """One firewall zone."""
    name: str
    description: Optional[str] = None
    default_action: Optional[str] = None
    default_log: bool = False
    local_zone: bool = False
    interfaces: List[str] = []
    vrfs: List[str] = []
    default_firewall: Optional[ZoneDefaultFirewall] = None
    from_zones: List[ZoneFromPolicy] = []
    intra_zone_filtering: Optional[ZoneIntraFiltering] = None


class ZonesConfigResponse(BaseModel):
    """All configured firewall zones."""
    zones: List[FirewallZone] = []
    total: int = 0


class _MergedBatch:
    """Combines operations from multiple builders for a single execute_batch call."""

    def __init__(self) -> None:
        self._ops: List[Dict[str, Any]] = []

    def extend(self, builder: Any) -> None:
        self._ops.extend(builder.get_operations())

    def get_operations(self) -> List[Dict[str, Any]]:
        return list(self._ops)

    def is_empty(self) -> bool:
        return len(self._ops) == 0


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/capabilities")
async def get_capabilities(request: Request) -> Dict[str, Any]:
    """Return version-aware capabilities for firewall zones."""
    await require_read_permission(request, FeatureGroup.FIREWALL_ZONES)

    try:
        service = get_session_vyos_service(request)
        builder = FirewallZonesBatchBuilder(version=service.get_version())
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=ZonesConfigResponse)
async def get_config(request: Request, refresh: bool = False) -> ZonesConfigResponse:
    """Return all configured firewall zones in one shape for 1.4 and 1.5."""
    await require_read_permission(request, FeatureGroup.FIREWALL_ZONES)

    try:
        service = get_session_vyos_service(request)
        mapper = cast(
            FirewallZonesMapper,
            CommandMapperRegistry.get_mapper("firewall_zones", service.get_version()),
        )
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return ZonesConfigResponse(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: ZoneBatchRequest) -> VyOSResponse:
    """
    Execute a batch of firewall zone operations in one commit.

    Each op names a builder method. The first parameter is bound to
    ``zone_name``; further parameters come from ``value``, split on ``:``
    (``from_zone:chain_name``). A zone-only op takes no value.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)

    try:
        service = get_session_vyos_service(http_request)
        batch = FirewallZonesBatchBuilder(version=service.get_version())

        try:
            for operation in request.operations:
                value = operation.value
                # A missing value is left to call_item_batch_op ("requires a value").
                if (
                    operation.op in COMPOSITE_OPS
                    and value
                    and value.strip()
                    and not _composite_ok(value)
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} has an invalid value",
                    )
                call_item_batch_op(
                    batch, operation.op, request.zone_name, value, separator=":"
                )
        except ValueError as exc:
            # The mapper rejects a zone node this device does not have.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error
        return VyOSResponse(
            success=ok,
            data={"message": "Zone configuration updated"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to execute firewall zone batch for zone '%s'", request.zone_name)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/provision", response_model=VyOSResponse)
async def provision_zone(http_request: Request, request: ZoneProvisionRequest) -> VyOSResponse:
    """
    Atomically provision a new zone with all firewall chains and from-zone assignments.

    Creates in a single VyOS transaction:
    - The zone with its configuration
    - IPv4 + IPv6 chains for every zone pair (both directions), default drop
    - From-zone assignments wired for each pair
    - If is_first_zone: LOCAL zone + LOCAL-{zone} / {zone}-LOCAL chains (default drop + rule 10 accept)

    The chains are firewall ipv4/ipv6 rulesets, so policies write is required too.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        z_batch = FirewallZonesBatchBuilder(version=version)
        v4_batch = FirewallIPv4BatchBuilder(version=version)
        v6_batch = FirewallIPv6BatchBuilder(version=version)

        name = request.zone_name

        # 1. Create the zone
        z_batch.set_zone(name)
        if request.description and request.description.strip():
            z_batch.set_zone_description(name, request.description)
        z_batch.set_zone_default_action(name, request.default_action)
        if request.default_log:
            z_batch.set_zone_default_log(name)
        for iface in request.interfaces:
            z_batch.set_zone_interface(name, iface)
        for vrf in request.vrfs:
            z_batch.set_zone_member_vrf(name, vrf)

        # 2. Intra-zone chain (same-zone traffic filtering)
        intra_v4 = f"{name}-{name}"
        intra_v6 = f"{name}-{name}-V6"
        for chain, builder in [(intra_v4, v4_batch), (intra_v6, v6_batch)]:
            builder.set_custom_chain(chain)
            builder.set_custom_chain_default_action(chain, "drop")
            builder.set_custom_chain_rule(chain, 10)
            builder.set_rule_action(chain, 10, "accept", is_custom=True)
        z_batch.set_zone_intra_zone_firewall_name(name, intra_v4)
        z_batch.set_zone_intra_zone_firewall_ipv6_name(name, intra_v6)

        # 3. For each peer zone, create chains in both directions and wire assignments
        for peer in request.existing_zones:
            # Direction A: traffic originating from NEW, arriving at PEER
            #   assigned to: zone PEER, from-zone NEW
            a4 = f"{name}-{peer}"
            a6 = f"{name}-{peer}-V6"
            for chain, builder in [(a4, v4_batch), (a6, v6_batch)]:
                builder.set_custom_chain(chain)
                builder.set_custom_chain_default_action(chain, "drop")
                builder.set_custom_chain_rule(chain, 10)
                builder.set_rule_action(chain, 10, "accept", is_custom=True)
            z_batch.set_zone_from(peer, name)
            z_batch.set_zone_from_firewall_name(peer, name, a4)
            z_batch.set_zone_from_firewall_ipv6_name(peer, name, a6)

            # Direction B: traffic originating from PEER, arriving at NEW
            #   assigned to: zone NEW, from-zone PEER
            b4 = f"{peer}-{name}"
            b6 = f"{peer}-{name}-V6"
            for chain, builder in [(b4, v4_batch), (b6, v6_batch)]:
                builder.set_custom_chain(chain)
                builder.set_custom_chain_default_action(chain, "drop")
                builder.set_custom_chain_rule(chain, 10)
                builder.set_rule_action(chain, 10, "accept", is_custom=True)
            z_batch.set_zone_from(name, peer)
            z_batch.set_zone_from_firewall_name(name, peer, b4)
            z_batch.set_zone_from_firewall_ipv6_name(name, peer, b6)

        # 4. Create LOCAL zone if this is the first zone
        if request.is_first_zone:
            z_batch.set_zone(LOCAL_ZONE)
            z_batch.set_zone_local_zone(LOCAL_ZONE)
            z_batch.set_zone_default_action(LOCAL_ZONE, "drop")

        # 5. Always create LOCAL ↔ NEW chains (LOCAL zone exists after first zone is provisioned)
        # LOCAL → NEW (traffic from LOCAL arriving at NEW)
        loc_to_new_v4 = f"{LOCAL_ZONE}-{name}"
        loc_to_new_v6 = f"{LOCAL_ZONE}-{name}-V6"
        for chain, builder in [(loc_to_new_v4, v4_batch), (loc_to_new_v6, v6_batch)]:
            builder.set_custom_chain(chain)
            builder.set_custom_chain_default_action(chain, "drop")
            builder.set_custom_chain_rule(chain, 10)
            builder.set_rule_action(chain, 10, "accept", is_custom=True)
        z_batch.set_zone_from(name, LOCAL_ZONE)
        z_batch.set_zone_from_firewall_name(name, LOCAL_ZONE, loc_to_new_v4)
        z_batch.set_zone_from_firewall_ipv6_name(name, LOCAL_ZONE, loc_to_new_v6)

        # NEW → LOCAL (traffic from NEW arriving at LOCAL)
        new_to_loc_v4 = f"{name}-{LOCAL_ZONE}"
        new_to_loc_v6 = f"{name}-{LOCAL_ZONE}-V6"
        for chain, builder in [(new_to_loc_v4, v4_batch), (new_to_loc_v6, v6_batch)]:
            builder.set_custom_chain(chain)
            builder.set_custom_chain_default_action(chain, "drop")
            builder.set_custom_chain_rule(chain, 10)
            builder.set_rule_action(chain, 10, "accept", is_custom=True)
        z_batch.set_zone_from(LOCAL_ZONE, name)
        z_batch.set_zone_from_firewall_name(LOCAL_ZONE, name, new_to_loc_v4)
        z_batch.set_zone_from_firewall_ipv6_name(LOCAL_ZONE, name, new_to_loc_v6)

        merged = _MergedBatch()
        merged.extend(z_batch)
        merged.extend(v4_batch)
        merged.extend(v6_batch)

        response = await run_in_threadpool(service.execute_batch, merged)
        ok = response.status == 200 and not response.error
        return VyOSResponse(
            success=ok,
            data={"message": "Zone provisioned"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to provision zone '%s'", request.zone_name)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/deprovision", response_model=VyOSResponse)
async def deprovision_zone(http_request: Request, request: ZoneDeprovisionRequest) -> VyOSResponse:
    """
    Atomically remove a zone and all its associated firewall chains and policies.

    Deletes in a single VyOS transaction:
    - The zone itself
    - IPv4 + IPv6 chains for every pair involving this zone
    - From-zone references to this zone in all peer zones
    - If is_last_zone: LOCAL zone + all LOCAL-zone chains

    The chains are firewall ipv4/ipv6 rulesets, so policies write is required too.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        z_batch = FirewallZonesBatchBuilder(version=version)
        v4_batch = FirewallIPv4BatchBuilder(version=version)
        v6_batch = FirewallIPv6BatchBuilder(version=version)

        name = request.zone_name

        # 1. Delete the zone
        z_batch.delete_zone(name)

        # 2. Delete intra-zone chains
        v4_batch.delete_custom_chain(f"{name}-{name}")
        v6_batch.delete_custom_chain(f"{name}-{name}-V6")

        # 3. Delete chains and from-zone refs for every peer
        for peer in request.peer_zones:
            # Chains: NAME-PEER and PEER-NAME (both directions)
            for chain, builder in [
                (f"{name}-{peer}", v4_batch),
                (f"{name}-{peer}-V6", v6_batch),
                (f"{peer}-{name}", v4_batch),
                (f"{peer}-{name}-V6", v6_batch),
            ]:
                builder.delete_custom_chain(chain)

            # Remove from-zone references in peer zones pointing to this zone
            z_batch.delete_zone_from(peer, name)

        # 4. Always delete LOCAL ↔ NAME chains (created for every zone)
        for chain, builder in [
            (f"{LOCAL_ZONE}-{name}", v4_batch),
            (f"{LOCAL_ZONE}-{name}-V6", v6_batch),
            (f"{name}-{LOCAL_ZONE}", v4_batch),
            (f"{name}-{LOCAL_ZONE}-V6", v6_batch),
        ]:
            builder.delete_custom_chain(chain)

        # 5. Delete LOCAL zone if this is the last non-local zone; otherwise clean up its from-zone ref
        if request.is_last_zone:
            z_batch.delete_zone(LOCAL_ZONE)
        else:
            z_batch.delete_zone_from(LOCAL_ZONE, name)

        merged = _MergedBatch()
        merged.extend(z_batch)
        merged.extend(v4_batch)
        merged.extend(v6_batch)

        response = await run_in_threadpool(service.execute_batch, merged)
        ok = response.status == 200 and not response.error
        return VyOSResponse(
            success=ok,
            data={"message": "Zone deprovisioned"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to deprovision zone '%s'", request.zone_name)
        raise HTTPException(status_code=500, detail="Internal server error")
