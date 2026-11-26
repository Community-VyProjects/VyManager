"""
Route Map Router

API endpoints for VyOS policy route-map configuration. The mapper decides
which nodes this VyOS version has; capabilities report them, and the config
read builds the response from the mapper's parse.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_item_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.route_map import RouteMapBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.route_map.route_map import RouteMapMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/route-map", tags=["route-map"])


# ============================================================================
# Pydantic Models
# ============================================================================


class MatchConditions(BaseModel):
    """Rule match leaves."""
    # BGP attributes
    as_path: Optional[str] = None
    community_list: Optional[str] = None
    community_exact_match: bool = False
    extcommunity: Optional[str] = None
    large_community_list: Optional[str] = None
    local_preference: Optional[int] = None
    metric: Optional[int] = None
    origin: Optional[str] = None
    peer: Optional[str] = None
    rpki: Optional[str] = None
    rpki_extcommunity: Optional[str] = None  # 1.5 only
    source_peer: Optional[str] = None  # 1.5 only

    # EVPN
    evpn_default_route: bool = False
    evpn_rd: Optional[str] = None
    evpn_route_type: Optional[str] = None
    evpn_vni: Optional[int] = None

    # IP / IPv6 address
    ip_address_access_list: Optional[str] = None
    ip_address_prefix_list: Optional[str] = None
    ip_address_prefix_len: Optional[int] = None
    ipv6_address_access_list: Optional[str] = None
    ipv6_address_prefix_list: Optional[str] = None
    ipv6_address_prefix_len: Optional[int] = None

    # Next-hop
    ip_nexthop_access_list: Optional[str] = None
    ip_nexthop_address: Optional[str] = None
    ip_nexthop_prefix_len: Optional[int] = None
    ip_nexthop_prefix_list: Optional[str] = None
    ip_nexthop_type: Optional[str] = None
    ipv6_nexthop_access_list: Optional[str] = None
    ipv6_nexthop_address: Optional[str] = None
    ipv6_nexthop_prefix_list: Optional[str] = None
    ipv6_nexthop_type: Optional[str] = None

    # Route source
    ip_route_source_access_list: Optional[str] = None
    ip_route_source_prefix_list: Optional[str] = None

    # Other
    interface: Optional[str] = None
    protocol: Optional[str] = None
    source_vrf: Optional[str] = None
    tag: Optional[int] = None


class SetActions(BaseModel):
    """Rule set leaves. A ``multi:`` leaf is a list."""
    # AS path
    as_path_exclude: Optional[str] = None
    as_path_prepend: Optional[str] = None
    as_path_prepend_last_as: Optional[int] = None

    # Communities
    community_add_values: List[str] = []
    community_replace_values: List[str] = []
    community_delete: Optional[str] = None  # community-list name
    community_remove_all: bool = False  # set community none
    large_community_add_values: List[str] = []
    large_community_replace_values: List[str] = []
    large_community_delete: Optional[str] = None  # large-community-list name
    large_community_remove_all: bool = False  # set large-community none
    extcommunity_bandwidth: Optional[str] = None
    extcommunity_bandwidth_non_transitive: bool = False
    extcommunity_rt: List[str] = []
    extcommunity_soo: List[str] = []
    extcommunity_none: bool = False

    # BGP attributes
    atomic_aggregate: bool = False
    aggregator_as: Optional[str] = None
    aggregator_ip: Optional[str] = None
    local_preference: Optional[int] = None
    origin: Optional[str] = None
    originator_id: Optional[str] = None
    weight: Optional[int] = None

    # Next-hop (``set ip-next-hop`` is one leaf: an address, or one of the flags)
    ip_nexthop: Optional[str] = None
    ip_nexthop_peer_address: bool = False
    ip_nexthop_unchanged: bool = False
    ipv6_nexthop_global: Optional[str] = None
    ipv6_nexthop_local: Optional[str] = None
    ipv6_nexthop_peer_address: bool = False
    ipv6_nexthop_prefer_global: bool = False
    l3vpn_nexthop_encapsulation_gre: bool = False

    # EVPN
    evpn_gateway_ipv4: Optional[str] = None
    evpn_gateway_ipv6: Optional[str] = None

    # Route properties
    distance: Optional[int] = None
    metric: Optional[str] = None
    metric_type: Optional[str] = None
    src: Optional[str] = None
    table: Optional[int] = None
    tag: Optional[int] = None


class RouteMapRule(BaseModel):
    rule_number: int
    description: Optional[str] = None
    action: str = "permit"
    call: Optional[str] = None
    continue_rule: Optional[int] = None
    on_match_goto: Optional[int] = None
    on_match_next: bool = False
    match: MatchConditions = MatchConditions()
    set: SetActions = SetActions()


class RouteMap(BaseModel):
    name: str
    description: Optional[str] = None
    rules: List[RouteMapRule] = []


class RouteMapConfig(BaseModel):
    route_maps: List[RouteMap] = []
    total: int = 0


class RouteMapBatchOperation(BaseModel):
    op: str = Field(..., description="Builder operation name")
    value: Optional[str] = Field(None, description="Operation value")


class RouteMapBatchRequest(BaseModel):
    """One commit on one route-map. Rule ops need rule_number; route-map ops take none."""
    name: str = Field(..., min_length=1, description="Route-map name")
    rule_number: Optional[int] = Field(None, ge=1, le=65535)
    operations: List[RouteMapBatchOperation]

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be blank")
        return value


class ReorderRequest(BaseModel):
    """New order of a route-map's rules; each listed number takes the next sorted slot."""
    name: str = Field(..., min_length=1)
    rule_numbers: List[int] = Field(..., min_length=1)

    @field_validator("rule_numbers")
    @classmethod
    def no_duplicates(cls, value: List[int]) -> List[int]:
        if len(set(value)) != len(value):
            raise ValueError("rule_numbers must not repeat")
        return value


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _mapper(version: str) -> RouteMapMapper:
    return cast(RouteMapMapper, CommandMapperRegistry.get_mapper("route_map", version))


# Reorder: the builder op that re-sets each rule-target leaf, and its CLI name.
_RETARGET_OPS: Dict[str, str] = {"continue": "set_rule_continue", "on_match_goto": "set_rule_on_match_goto"}
_TARGET_LABELS: Dict[str, str] = {"continue": "continue", "on_match_goto": "on-match goto"}


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_route_map_capabilities(http_request: Request):
    """Feature flags, value lists and ranges for this device's VyOS version."""
    await require_read_permission(http_request, FeatureGroup.ROUTE_MAP)

    try:
        service = get_session_vyos_service(http_request)
        builder = RouteMapBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(http_request.state, "instance") and http_request.state.instance:
            capabilities["instance_name"] = http_request.state.instance.get("name")
            capabilities["instance_id"] = http_request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route-map capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=RouteMapConfig)
async def get_route_map_config(http_request: Request, refresh: bool = False):
    """Every route-map."""
    await require_read_permission(http_request, FeatureGroup.ROUTE_MAP)

    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return RouteMapConfig(**mapper.parse_config(full_config or {}))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route-map config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def route_map_batch_configure(http_request: Request, body: RouteMapBatchRequest):
    """Run a batch of builder ops on one route-map in a single commit.

    Every op takes the route-map name; an op with a ``rule`` parameter needs
    rule_number and an op without one rejects it. The value fills the rest.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTE_MAP)

    try:
        service = get_session_vyos_service(http_request)
        builder = RouteMapBatchBuilder(version=service.get_version())
        rule = str(body.rule_number) if body.rule_number else None

        try:
            for operation in body.operations:
                call_item_batch_op(builder, operation.op, body.name, operation.value, bound={"rule": rule})
        except ValueError as exc:
            # The builder raises ValueError for a name, value or node the device rejects.
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"} if response.status == 200 else None,
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route-map batch")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_route_map_rules(http_request: Request, body: ReorderRequest):
    """Renumber a route-map's rules in one commit.

    The listed rules must be exactly the route-map's rules. Each moved rule is
    deleted and recreated from its own config subtree under its new number,
    so every leaf the device holds is kept. ``continue`` / ``on-match goto``
    targets that moved follow their rule (in a rule that stays put too); a
    target that would not be greater than its rule's new number is a 400.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTE_MAP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        mapper = _mapper(version)
        builder = RouteMapBatchBuilder(version=version)

        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        trees = mapper.rule_trees(full_config or {}, body.name)
        if trees is None:
            raise HTTPException(status_code=404, detail=f"Route-map {body.name} not found")
        if set(trees) != set(body.rule_numbers):
            raise HTTPException(status_code=400, detail="rule_numbers must list every rule of the route-map")

        targets = sorted(body.rule_numbers)
        moves = [(old, new) for old, new in zip(body.rule_numbers, targets) if old != new]
        if not moves:
            return VyOSResponse(success=True, data={"message": "Rules reordered"})
        renumber = dict(moves)

        # ``continue`` and ``on-match goto`` name rules of this map. A target
        # that moved follows it; the lab verify requires every target to be
        # greater than its own rule number, on both versions.
        retarget: List[Tuple[int, str, int]] = []
        for old in sorted(trees):
            rule_new = renumber.get(old, old)
            for leaf, target in mapper.rule_targets(trees[old]).items():
                new_target = renumber.get(target, target)
                if new_target <= rule_new:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Rule {old} cannot move to {rule_new}: its {_TARGET_LABELS[leaf]} "
                            f"target {new_target} must be greater than its rule number"
                        ),
                    )
                if old not in renumber and target in renumber:
                    retarget.append((old, leaf, new_target))

        try:
            for old, _ in moves:
                builder.delete_rule(body.name, str(old))
            for old, new in moves:
                builder.restore_rule(body.name, str(new), mapper.retarget_rule_tree(trees[old], renumber))
            # A rule that stays put but points at a moved rule gets the new number.
            for old, leaf, new_target in retarget:
                getattr(builder, _RETARGET_OPS[leaf])(body.name, str(old), str(new_target))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered"} if response.status == 200 else None,
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route-map reorder")
        raise HTTPException(status_code=500, detail="Internal server error")
