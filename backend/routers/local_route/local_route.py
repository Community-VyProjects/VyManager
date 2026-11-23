"""
Local Route Router

API endpoints for managing VyOS local route policy configuration.
Supports both IPv4 (local-route) and IPv6 (local-route6) rules.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Literal, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.local_route import LocalRouteBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.local_route import LocalRouteMapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
import logging
from batch_dispatch import call_item_batch_op, resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/local-route", tags=["local-route"])


# ============================================================================
# Pydantic Models
# ============================================================================


class LocalRouteRuleFields(BaseModel):
    """Match and set leaves of a local route rule (IPv4 or IPv6)."""

    source: Optional[str] = Field(None, description="Source address or prefix")
    destination: Optional[str] = Field(None, description="Destination address or prefix")
    inbound_interface: Optional[str] = Field(None, description="Inbound interface name")
    fwmark: Optional[str] = Field(None, description="Firewall mark to match")
    protocol: Optional[str] = Field(None, description="IP protocol name or number")
    source_port: Optional[str] = Field(None, description="Source port")
    destination_port: Optional[str] = Field(None, description="Destination port")
    table: Optional[str] = Field(None, description="Routing table (1-200 or 'main')")
    vrf: Optional[str] = Field(None, description="VRF instance name (VyOS 1.5+ only)")


class LocalRouteRule(LocalRouteRuleFields):
    """Model for a local route rule (IPv4 or IPv6)."""

    rule_number: int = Field(..., ge=1, le=32765, description="Rule number (1-32765)")


class LocalRouteConfigResponse(BaseModel):
    """Response containing all local route rules."""

    ipv4_rules: List[LocalRouteRule] = []
    ipv6_rules: List[LocalRouteRule] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class LocalRouteCapabilitiesResponse(BaseModel):
    """Response containing feature capabilities."""

    version: str
    features: Dict[str, Any]
    device_name: Optional[str] = None


class LocalRouteBatchOperation(BaseModel):
    """Single operation in a batch request."""

    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class LocalRouteBatchRequest(BaseModel):
    """Model for batch configuration."""

    rule_number: int = Field(..., ge=1, le=32765, description="Rule number")
    rule_type: Literal["ipv4", "ipv6"] = Field(..., description="Rule type: 'ipv4' or 'ipv6'")
    operations: List[LocalRouteBatchOperation]


class LocalRouteReorderItem(BaseModel):
    """One rule moved from old_number to new_number."""

    old_number: int = Field(..., ge=1, le=32765)
    new_number: int = Field(..., ge=1, le=32765)
    rule_data: LocalRouteRuleFields


class LocalRouteReorderRequest(BaseModel):
    """Model for reordering rules."""

    rule_type: Literal["ipv4", "ipv6"] = Field(..., description="Rule type: 'ipv4' or 'ipv6'")
    rules: List[LocalRouteReorderItem] = Field(
        ..., description="List of rules with old and new numbers"
    )

    @model_validator(mode="after")
    def _numbers_are_unique(self) -> "LocalRouteReorderRequest":
        """Two rules on one number would merge their leaves in the commit."""
        for field in ("old_number", "new_number"):
            numbers = [getattr(rule, field) for rule in self.rules]
            if len(numbers) != len(set(numbers)):
                raise ValueError(f"{field} values must be unique")
        return self


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities", response_model=LocalRouteCapabilitiesResponse)
async def get_local_route_capabilities(http_request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.LOCAL_ROUTE)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=LocalRouteConfigResponse)
async def get_local_route_config(http_request: Request, refresh: bool = False):
    """
    Get all local route configurations in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data for IPv4 and IPv6 rules
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.LOCAL_ROUTE)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
        mapper = cast(
            LocalRouteMapper,
            CommandMapperRegistry.get_mapper("local_route", service.get_version()),
        )
        return LocalRouteConfigResponse(**mapper.parse_config(full_config))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def local_route_batch_configure(http_request: Request, body: LocalRouteBatchRequest):
    """
    Execute a batch of configuration operations for a local route rule.

    Each op names a builder method of this rule type. The first parameter is
    bound to ``rule_number`` and the value fills the second; a rule-only op
    takes no value.
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.LOCAL_ROUTE)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)

        try:
            for operation in body.operations:
                # Resolve first so an unknown or internal op reports itself, not the family.
                resolve_batch_method(builder, operation.op)
                if ("local_route6" in operation.op) != (body.rule_type == "ipv6"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} does not match rule type {body.rule_type}",
                    )
                call_item_batch_op(builder, operation.op, body.rule_number, operation.value)
        except ValueError as e:
            # The mapper rejects a node this device version does not have.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "Configuration updated"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint 4: Reorder Rules
# ============================================================================


@router.post("/reorder")
async def local_route_reorder_rules(http_request: Request, body: LocalRouteReorderRequest):
    """
    Reorder local route rules by renumbering them.

    This is done by deleting all rules and recreating them with new numbers
    in a single batch operation.
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.LOCAL_ROUTE)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)

        if body.rule_type == "ipv4":
            delete_rule = builder.delete_local_route_rule
            create_rule = builder.set_local_route_rule
            setters = {
                "source": builder.set_local_route_rule_source,
                "destination": builder.set_local_route_rule_destination,
                "inbound_interface": builder.set_local_route_rule_inbound_interface,
                "fwmark": builder.set_local_route_rule_fwmark,
                "protocol": builder.set_local_route_rule_protocol,
                "source_port": builder.set_local_route_rule_source_port,
                "destination_port": builder.set_local_route_rule_destination_port,
                "table": builder.set_local_route_rule_set_table,
                "vrf": builder.set_local_route_rule_set_vrf,
            }
        else:
            delete_rule = builder.delete_local_route6_rule
            create_rule = builder.set_local_route6_rule
            setters = {
                "source": builder.set_local_route6_rule_source,
                "destination": builder.set_local_route6_rule_destination,
                "inbound_interface": builder.set_local_route6_rule_inbound_interface,
                "fwmark": builder.set_local_route6_rule_fwmark,
                "protocol": builder.set_local_route6_rule_protocol,
                "source_port": builder.set_local_route6_rule_source_port,
                "destination_port": builder.set_local_route6_rule_destination_port,
                "table": builder.set_local_route6_rule_set_table,
                "vrf": builder.set_local_route6_rule_set_vrf,
            }

        try:
            # Step 1: Delete all rules in reverse order
            for old_num in sorted((rule.old_number for rule in body.rules), reverse=True):
                delete_rule(old_num)

            # Step 2: Recreate rules with new numbers
            for rule in body.rules:
                create_rule(rule.new_number)
                for field, setter in setters.items():
                    value = getattr(rule.rule_data, field)
                    if value:
                        setter(rule.new_number, value)
        except ValueError as e:
            # The mapper rejects a node this device version does not have.
            raise HTTPException(status_code=400, detail=str(e))

        response = await run_in_threadpool(service.execute_batch, builder)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "Rules reordered successfully"} if ok else None,
            error=None if ok else response.error,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
