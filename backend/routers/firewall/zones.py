"""
Firewall Zones Router

API endpoints for managing VyOS firewall zone configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5.

VyOS 1.4 vs 1.5 differences:
- Interfaces: 1.4 uses `interface` at zone level; 1.5 uses `member interface` / `member vrf`
- Default firewall: 1.5 adds `default-firewall name/ipv6-name`
"""

import logging
from typing import Any, Dict, List, Literal, Optional, Set, Tuple, cast

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
from vyos_mappers.firewall import FirewallFamilyMapper, FirewallZonesMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import call_item_batch_op

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/firewall/zones", tags=["firewall-zones"])

# Builder ops that split "from_zone:chain_name" themselves.
COMPOSITE_OPS = frozenset({"set_zone_from_ipv4", "set_zone_from_ipv6"})

# The name /provision gives the local zone when the device has none yet.
LOCAL_ZONE = "LOCAL"


def _zone_name_not_blank(value: str) -> str:
    if not value or value != value.strip():
        raise ValueError("zone_name must not be blank or padded")
    return value


def _names_not_blank_or_repeated(values: List[str]) -> List[str]:
    if any(not value or value != value.strip() for value in values):
        raise ValueError("names must not be blank or padded")
    if len(set(values)) != len(values):
        raise ValueError("names must not repeat")
    return values


def _not_self(zone_name: str, peers: List[str]) -> None:
    """Pair chains and from-zone refs are built from these names."""
    if zone_name in peers:
        raise ValueError("peer zones must not include the zone itself")


def _local_zone_name(parsed: Dict[str, Any]) -> Optional[str]:
    """The configured zone marked local-zone, whatever it is called."""
    for zone in parsed["zones"]:
        if zone["local_zone"]:
            return zone["name"]
    return None


def _reject_local_peer(local: str, zone_name: str, peers: List[str]) -> None:
    if zone_name == local or local in peers:
        raise HTTPException(
            status_code=400,
            detail=f"The local zone {local} cannot be a peer or the zone itself",
        )


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
        description="When True and the device has no local zone, create one named LOCAL"
    )

    _zone_name = field_validator("zone_name")(_zone_name_not_blank)
    _names = field_validator("interfaces", "vrfs", "existing_zones")(_names_not_blank_or_repeated)

    @model_validator(mode="after")
    def _peers(self) -> "ZoneProvisionRequest":
        _not_self(self.zone_name, self.existing_zones)
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
        description="When True, also delete the device's local zone"
    )

    _zone_name = field_validator("zone_name")(_zone_name_not_blank)
    _names = field_validator("peer_zones")(_names_not_blank_or_repeated)

    @model_validator(mode="after")
    def _peers(self) -> "ZoneDeprovisionRequest":
        _not_self(self.zone_name, self.peer_zones)
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


def _ruleset_names(version: str, full_config: Dict[str, Any]) -> Dict[str, Set[str]]:
    """Custom ruleset names per family, read through the family mappers."""
    names: Dict[str, Set[str]] = {}
    for family in ("ipv4", "ipv6"):
        mapper = cast(
            FirewallFamilyMapper,
            CommandMapperRegistry.get_mapper(f"firewall_{family}", version),
        )
        names[family] = {chain["name"] for chain in mapper.parse_config(full_config)["custom_chains"]}
    return names


def _pair_chains(src: str, dst: str) -> Tuple[str, str]:
    """IPv4 and IPv6 ruleset names for traffic from src arriving at dst."""
    return f"{src}-{dst}", f"{src}-{dst}-V6"


def _non_local_zones(parsed: Dict[str, Any], exclude: str) -> Set[str]:
    return {zone["name"] for zone in parsed["zones"] if not zone["local_zone"] and zone["name"] != exclude}


@router.post("/provision", response_model=VyOSResponse)
async def provision_zone(http_request: Request, request: ZoneProvisionRequest) -> VyOSResponse:
    """
    Atomically provision a new zone with all firewall chains and from-zone assignments.

    Creates in a single VyOS transaction:
    - The zone with its configuration
    - IPv4 + IPv6 chains (default drop + rule 10 accept) for the zone itself and for
      every pair with the other non-local zones and the local zone, both directions
    - From-zone assignments wired for each pair

    The local zone keeps the name it has on the device. If the device has none and
    is_first_zone is set, a local zone named LOCAL is created first. existing_zones
    must name every other non-local zone, and no chain this creates may already
    exist, so a stale screen never overwrites a ruleset.

    The chains are firewall ipv4/ipv6 rulesets, so policies write is required too.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = cast(
            FirewallZonesMapper,
            CommandMapperRegistry.get_mapper("firewall_zones", version),
        )
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        parsed = mapper.parse_config(full_config)

        name = request.zone_name
        if any(zone["name"] == name for zone in parsed["zones"]):
            raise HTTPException(status_code=400, detail=f"Zone {name} already exists")
        local = _local_zone_name(parsed)
        if local is None and not request.is_first_zone:
            raise HTTPException(status_code=400, detail="The device has no local zone")
        create_local = local is None
        local = local or LOCAL_ZONE
        _reject_local_peer(local, name, request.existing_zones)
        if set(request.existing_zones) != _non_local_zones(parsed, name):
            raise HTTPException(
                status_code=400,
                detail="existing_zones must list every other non-local zone on the device",
            )

        # Each (src, dst) pair gets an IPv4 and an IPv6 chain, wired as
        # zone dst, from src. src == dst is the intra-zone chain.
        pairs = [(name, name)]
        for peer in request.existing_zones:
            pairs += [(name, peer), (peer, name)]
        pairs += [(local, name), (name, local)]

        rulesets = _ruleset_names(version, full_config)
        for src, dst in pairs:
            v4, v6 = _pair_chains(src, dst)
            if v4 in rulesets["ipv4"] or v6 in rulesets["ipv6"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ruleset {v4 if v4 in rulesets['ipv4'] else v6} already exists",
                )

        z_batch = FirewallZonesBatchBuilder(version=version)
        v4_batch = FirewallIPv4BatchBuilder(version=version)
        v6_batch = FirewallIPv6BatchBuilder(version=version)

        # 1. Create the zone (and the local zone when the device has none)
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
        if create_local:
            z_batch.set_zone(local)
            z_batch.set_zone_local_zone(local)
            z_batch.set_zone_default_action(local, "drop")

        # 2. One chain pair per zone pair, default drop with rule 10 accept
        for src, dst in pairs:
            v4, v6 = _pair_chains(src, dst)
            for chain, builder in [(v4, v4_batch), (v6, v6_batch)]:
                builder.set_custom_chain(chain)
                builder.set_custom_chain_default_action(chain, "drop")
                builder.set_custom_chain_rule(chain, 10)
                builder.set_rule_action(chain, 10, "accept", is_custom=True)
            if src == dst:
                z_batch.set_zone_intra_zone_firewall_name(dst, v4)
                z_batch.set_zone_intra_zone_firewall_ipv6_name(dst, v6)
            else:
                z_batch.set_zone_from(dst, src)
                z_batch.set_zone_from_firewall_name(dst, src, v4)
                z_batch.set_zone_from_firewall_ipv6_name(dst, src, v6)

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
    Atomically remove a zone and the chains and from-zone references provision made.

    Deletes in a single VyOS transaction:
    - The zone itself
    - Each IPv4 + IPv6 chain named for a pair involving this zone that exists
    - Every from-zone reference to this zone in the other zones; with is_last_zone
      the local zone itself instead of its reference

    peer_zones and is_last_zone must match the device, and nothing absent is
    deleted, so a zone built outside VyManager can still be removed.

    The chains are firewall ipv4/ipv6 rulesets, so policies write is required too.
    """
    await require_write_permission(http_request, FeatureGroup.FIREWALL_ZONES)
    await require_write_permission(http_request, FeatureGroup.FIREWALL_POLICIES)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = cast(
            FirewallZonesMapper,
            CommandMapperRegistry.get_mapper("firewall_zones", version),
        )
        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        parsed = mapper.parse_config(full_config)

        name = request.zone_name
        if not any(zone["name"] == name for zone in parsed["zones"]):
            raise HTTPException(status_code=404, detail=f"Zone {name} does not exist")
        local = _local_zone_name(parsed)
        if local is not None:
            _reject_local_peer(local, name, request.peer_zones)
        peers = _non_local_zones(parsed, name)
        if set(request.peer_zones) != peers or request.is_last_zone != (not peers):
            raise HTTPException(
                status_code=400,
                detail="peer_zones and is_last_zone must match the zones on the device",
            )

        z_batch = FirewallZonesBatchBuilder(version=version)
        v4_batch = FirewallIPv4BatchBuilder(version=version)
        v6_batch = FirewallIPv6BatchBuilder(version=version)

        # 1. Delete the zone, and the local zone with the last non-local zone
        z_batch.delete_zone(name)
        if request.is_last_zone and local is not None:
            z_batch.delete_zone(local)

        # 2. Delete the from-zone references other zones still hold to it
        for zone in parsed["zones"]:
            if zone["name"] == name or (request.is_last_zone and zone["name"] == local):
                continue
            if any(policy["from_zone"] == name for policy in zone["from_zones"]):
                z_batch.delete_zone_from(zone["name"], name)

        # 3. Delete the chains named for its pairs that exist
        others = sorted(peers) + ([local] if local is not None else [])
        pairs = [(name, name)]
        for other in others:
            pairs += [(name, other), (other, name)]
        rulesets = _ruleset_names(version, full_config)
        for src, dst in pairs:
            v4, v6 = _pair_chains(src, dst)
            if v4 in rulesets["ipv4"]:
                v4_batch.delete_custom_chain(v4)
            if v6 in rulesets["ipv6"]:
                v6_batch.delete_custom_chain(v6)

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
