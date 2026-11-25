"""
Route Policy Router

API endpoints for VyOS policy route and route6 configuration. The mapper
decides which nodes this VyOS version has; capabilities report them, and the
config read returns the mapper's parse unchanged.
"""

import logging
from typing import Any, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_item_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.route import RouteBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.route.route import RouteMapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/route", tags=["route"])

PolicyType = Literal["route", "route6"]


# ============================================================================
# Pydantic Models
# ============================================================================


class GeoIPMatch(BaseModel):
    """Source or destination geoip match (1.5 only; empty on 1.4)."""
    country_code: List[str] = []
    asn: List[str] = []
    inverse_match: bool = False


class MatchConditions(BaseModel):
    """Rule match leaves. A ``multi:`` leaf is a list."""
    connection_mark: List[str] = []
    destination_address: Optional[str] = None
    destination_geoip: GeoIPMatch = GeoIPMatch()
    destination_group_address: Optional[str] = None
    destination_group_domain: Optional[str] = None
    destination_group_mac: Optional[str] = None
    destination_group_network: Optional[str] = None
    destination_group_port: Optional[str] = None
    destination_port: Optional[str] = None
    dscp: List[str] = []
    dscp_exclude: List[str] = []
    fragment: List[str] = []
    hop_limit_eq: Optional[str] = None
    hop_limit_gt: Optional[str] = None
    hop_limit_lt: Optional[str] = None
    icmp_code: Optional[str] = None
    icmp_type: Optional[str] = None
    icmp_type_name: Optional[str] = None
    icmpv6_type: Optional[str] = None
    ipsec: List[str] = []
    limit_burst: Optional[str] = None
    limit_rate: Optional[str] = None
    mark: Optional[str] = None
    packet_length: List[str] = []
    packet_length_exclude: List[str] = []
    packet_type: Optional[str] = None
    protocol: Optional[str] = None
    recent_count: Optional[str] = None
    recent_time: Optional[str] = None
    source_address: Optional[str] = None
    source_geoip: GeoIPMatch = GeoIPMatch()
    source_group_address: Optional[str] = None
    source_group_domain: Optional[str] = None
    source_group_mac: Optional[str] = None
    source_group_network: Optional[str] = None
    source_group_port: Optional[str] = None
    source_mac_address: Optional[str] = None
    source_port: Optional[str] = None
    state: List[str] = []
    tcp_flags: List[str] = []
    tcp_flags_not: List[str] = []
    tcp_mss: Optional[str] = None
    time_monthdays: Optional[str] = None
    time_startdate: Optional[str] = None
    time_starttime: Optional[str] = None
    time_stopdate: Optional[str] = None
    time_stoptime: Optional[str] = None
    time_utc: bool = False
    time_weekdays: Optional[str] = None
    ttl_eq: Optional[str] = None
    ttl_gt: Optional[str] = None
    ttl_lt: Optional[str] = None


class SetActions(BaseModel):
    connection_mark: Optional[str] = None
    dscp: Optional[str] = None
    mark: Optional[str] = None
    table: Optional[str] = None
    tcp_mss: Optional[str] = None
    vrf: Optional[str] = None


class PolicyRouteRule(BaseModel):
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    log: bool = False
    action: Optional[str] = None
    match: MatchConditions = MatchConditions()
    set: SetActions = SetActions()


class PolicyRoute(BaseModel):
    name: str
    policy_type: PolicyType
    description: Optional[str] = None
    default_log: bool = False
    interfaces: List[str] = []
    rules: List[PolicyRouteRule] = []


class RouteConfigResponse(BaseModel):
    ipv4_policies: List[PolicyRoute] = []
    ipv6_policies: List[PolicyRoute] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class RouteBatchOperation(BaseModel):
    op: str = Field(..., description="Builder operation name")
    value: Optional[str] = Field(None, description="Value; '|' separates the parts of a two-value op")


class RouteBatchRequest(BaseModel):
    """One commit on one policy. Rule ops need rule_number; policy ops take none."""
    policy_type: PolicyType
    name: str = Field(..., min_length=1)
    rule_number: Optional[int] = Field(None, ge=1, le=999999)
    operations: List[RouteBatchOperation]

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be blank")
        return value


class ReorderRequest(BaseModel):
    """New order of a policy's rules; each listed number takes the next sorted slot."""
    policy_type: PolicyType
    policy_name: str = Field(..., min_length=1)
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


def _mapper(version: str) -> RouteMapper:
    return cast(RouteMapper, CommandMapperRegistry.get_mapper("route", version))


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_route_capabilities(request: Request):
    """Feature flags and value lists for this device's VyOS version."""
    await require_read_permission(request, FeatureGroup.ROUTE_POLICY)

    try:
        service = get_session_vyos_service(request)
        builder = RouteBatchBuilder(version=service.get_version())
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=RouteConfigResponse)
async def get_route_config(http_request: Request, refresh: bool = False):
    """Every policy route and route6 policy."""
    await require_read_permission(http_request, FeatureGroup.ROUTE_POLICY)

    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        return RouteConfigResponse(**mapper.parse_config(full_config or {}))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def route_batch_configure(http_request: Request, body: RouteBatchRequest):
    """Run a batch of builder ops on one policy in a single commit.

    Every op takes policy_type and name; an op with a ``rule`` parameter needs
    rule_number and an op without one rejects it. The value fills the rest,
    split on '|' (ttl / hop-limit take ``<eq|gt|lt>|<n>``).
    """
    await require_write_permission(http_request, FeatureGroup.ROUTE_POLICY)

    try:
        service = get_session_vyos_service(http_request)
        builder = RouteBatchBuilder(version=service.get_version())
        rule = str(body.rule_number) if body.rule_number else None

        try:
            for operation in body.operations:
                call_item_batch_op(
                    builder,
                    operation.op,
                    body.policy_type,
                    operation.value,
                    bound={"name": body.name, "rule": rule},
                )
        except ValueError as exc:
            # The mapper raises ValueError for a node or value this VyOS version lacks.
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
        logger.exception("Unhandled error in route batch")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_rules(http_request: Request, body: ReorderRequest):
    """Renumber a policy's rules in one commit.

    The listed rules must be exactly the policy's rules. Each is deleted and
    recreated from its own config subtree under its new number, so no leaf
    is dropped.
    """
    await require_write_permission(http_request, FeatureGroup.ROUTE_POLICY)

    try:
        service = get_session_vyos_service(http_request)
        mapper = _mapper(service.get_version())
        builder = RouteBatchBuilder(version=service.get_version())

        full_config = await run_in_threadpool(service.get_full_config, refresh=True)
        trees = mapper.rule_trees(full_config or {}, body.policy_type, body.policy_name)
        if trees is None:
            raise HTTPException(status_code=404, detail=f"Policy {body.policy_name} not found")
        if set(trees) != set(body.rule_numbers):
            raise HTTPException(status_code=400, detail="rule_numbers must list every rule of the policy")

        targets = sorted(body.rule_numbers)
        moves = [(old, new) for old, new in zip(body.rule_numbers, targets) if old != new]
        if not moves:
            return VyOSResponse(success=True, data={"message": "Rules reordered"})

        for old, _ in moves:
            builder.delete_rule(body.policy_type, body.policy_name, str(old))
        for old, new in moves:
            builder.restore_rule(body.policy_type, body.policy_name, str(new), trees[old])

        response = await run_in_threadpool(service.execute_batch, builder)
        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered"} if response.status == 200 else None,
            error=response.error or None,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in route reorder")
        raise HTTPException(status_code=500, detail="Internal server error")
