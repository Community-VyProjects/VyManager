"""
NAT66 Router

API endpoints for managing VyOS NAT66 configuration.
Supports source and destination NAT66 rules for IPv6-to-IPv6 translation.
"""

import logging
from typing import Any, Callable, Dict, List, Literal, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_item_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.nat66 import NAT66BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat66 import NAT66Mapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat66", tags=["nat66"])

RuleType = Literal["source", "destination"]


# ==================== Request/Response Models ====================

class NAT66BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value; several values are joined with ':'")


class NAT66BatchRequest(BaseModel):
    """Model for batch NAT66 rule configuration."""
    rule_number: int = Field(..., ge=1, le=999999, description="NAT66 rule number")
    rule_type: RuleType = Field(..., description="Rule type: 'source' or 'destination'")
    operations: List[NAT66BatchOperation] = Field(..., description="List of operations to perform")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "rule_number": 100,
            "rule_type": "source",
            "operations": [
                {"op": "set_source_rule"},
                {"op": "set_source_rule_description", "value": "IPv6 masquerade"},
                {"op": "set_source_rule_outbound_interface_name", "value": "eth0"},
                {"op": "set_source_rule_translation_address", "value": "masquerade"},
                {"op": "set_source_rule_destination_group", "value": "address-group:SERVERS"},
            ]
        }
    })


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== Config Response Models ====================

class NAT66RuleGroup(BaseModel):
    """Firewall group matches on one side of a rule (VyOS 1.5 only)."""
    model_config = ConfigDict(extra="forbid")
    address_group: Optional[str] = None
    domain_group: Optional[str] = None
    mac_group: Optional[str] = None
    network_group: Optional[str] = None
    port_group: Optional[str] = None


class NAT66RuleMatch(BaseModel):
    """Source or destination match. Source rules use ``prefix``, destination rules ``address``."""
    model_config = ConfigDict(extra="forbid")
    address: Optional[str] = None
    prefix: Optional[str] = None
    port: Optional[str] = None
    group: Optional[NAT66RuleGroup] = None


class NAT66RuleTranslation(BaseModel):
    """Translation configuration for a NAT66 rule."""
    model_config = ConfigDict(extra="forbid")
    address: Optional[str] = None
    port: Optional[str] = None


class NAT66RuleData(BaseModel):
    """Leaves of one rule, without its number (the reorder body)."""
    model_config = ConfigDict(extra="forbid")
    description: Optional[str] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False
    protocol: Optional[str] = None
    outbound_interface: Optional[str] = None
    inbound_interface: Optional[str] = None
    source: Optional[NAT66RuleMatch] = None
    destination: Optional[NAT66RuleMatch] = None
    translation: Optional[NAT66RuleTranslation] = None


class NAT66SourceRule(BaseModel):
    """NAT66 source rule configuration."""
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False
    protocol: Optional[str] = None
    outbound_interface: Optional[str] = None
    source: Optional[NAT66RuleMatch] = None
    destination: Optional[NAT66RuleMatch] = None
    translation: Optional[NAT66RuleTranslation] = None


class NAT66DestinationRule(BaseModel):
    """NAT66 destination rule configuration."""
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False
    protocol: Optional[str] = None
    inbound_interface: Optional[str] = None
    source: Optional[NAT66RuleMatch] = None
    destination: Optional[NAT66RuleMatch] = None
    translation: Optional[NAT66RuleTranslation] = None


class NAT66ConfigResponse(BaseModel):
    """Full NAT66 configuration response."""
    source_rules: List[NAT66SourceRule] = []
    destination_rules: List[NAT66DestinationRule] = []
    total: int = 0


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int = Field(..., ge=1, le=999999)
    new_number: Optional[int] = Field(None, ge=1, le=999999)  # None = delete-only
    rule_data: Optional[NAT66RuleData] = None

    @model_validator(mode="after")
    def _data_for_recreated_rule(self) -> "ReorderRuleItem":
        if self.new_number is not None and self.rule_data is None:
            raise ValueError("rule_data is required when new_number is set")
        return self


class ReorderNAT66Request(BaseModel):
    """Request model for reordering NAT66 rules."""
    rule_type: RuleType = Field(..., description="Rule type: 'source' or 'destination'")
    rules: List[ReorderRuleItem] = Field(..., min_length=1, description="Rules with old and new numbers")

    @model_validator(mode="after")
    def _rules_match_type(self) -> "ReorderNAT66Request":
        old = [item.old_number for item in self.rules]
        new = [item.new_number for item in self.rules if item.new_number is not None]
        if len(set(old)) != len(old):
            raise ValueError("duplicate old_number")
        if len(set(new)) != len(new):
            raise ValueError("duplicate new_number")
        is_source = self.rule_type == "source"
        for item in self.rules:
            data = item.rule_data
            if data is None:
                continue
            wrong_interface = data.inbound_interface if is_source else data.outbound_interface
            wrong_match = [
                (side.address if is_source else side.prefix)
                for side in (data.source, data.destination)
                if side is not None
            ]
            if wrong_interface or any(wrong_match):
                raise ValueError(f"rule_data has leaves a {self.rule_type} rule does not have")
        return self


# ==================== Endpoints ====================

@router.get("/capabilities")
async def get_capabilities(request: Request):
    """Get NAT66 capabilities for the current VyOS version."""
    await require_read_permission(request, FeatureGroup.NAT66)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = NAT66BatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=NAT66ConfigResponse)
async def get_config(request: Request, refresh: bool = False):
    """Get current NAT66 configuration."""
    await require_read_permission(request, FeatureGroup.NAT66)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        mapper = cast(NAT66Mapper, CommandMapperRegistry.get_mapper("nat66", version))
        return NAT66ConfigResponse(**mapper.parse_config(full_config))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: NAT66BatchRequest):
    """Execute batch NAT66 operations in a single commit.

    Each op names a builder method of this rule type. The first parameter is
    bound to ``rule_number``; further parameters come from ``value``, split on
    ``:`` (``group_type:name`` for a group match). A rule-only op takes no value.
    """
    await require_write_permission(http_request, FeatureGroup.NAT66)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT66BatchBuilder(version=service.get_version())

        prefixes = (f"set_{request.rule_type}_rule", f"delete_{request.rule_type}_rule")
        try:
            for operation in request.operations:
                if not operation.op.startswith(prefixes):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation {operation.op} is not a {request.rule_type} rule operation",
                    )
                call_item_batch_op(
                    batch, operation.op, request.rule_number, operation.value, separator=":"
                )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        if batch.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "NAT66 configuration updated"} if ok else None,
            error=None if ok else response.error,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def _set_groups(
    set_group: Callable[[int, str, str], Any],
    number: int,
    side: Optional[NAT66RuleMatch],
) -> None:
    """Re-set each group match; the builder rejects a type the device lacks (ValueError)."""
    if side is None or side.group is None:
        return
    for key, name in side.group.model_dump().items():
        if name:
            set_group(number, key.replace("_", "-"), name)


def _recreate_source_rule(batch: NAT66BatchBuilder, num: int, rd: NAT66RuleData) -> None:
    batch.set_source_rule(num)
    if rd.description:
        batch.set_source_rule_description(num, rd.description)
    if rd.disable:
        batch.set_source_rule_disable(num)
    if rd.exclude:
        batch.set_source_rule_exclude(num)
    if rd.log:
        batch.set_source_rule_log(num)
    if rd.protocol:
        batch.set_source_rule_protocol(num, rd.protocol)
    if rd.outbound_interface:
        batch.set_source_rule_outbound_interface_name(num, rd.outbound_interface)
    if rd.source is not None:
        if rd.source.prefix:
            batch.set_source_rule_source_prefix(num, rd.source.prefix)
        if rd.source.port:
            batch.set_source_rule_source_port(num, rd.source.port)
    _set_groups(batch.set_source_rule_source_group, num, rd.source)
    if rd.destination is not None:
        if rd.destination.prefix:
            batch.set_source_rule_destination_prefix(num, rd.destination.prefix)
        if rd.destination.port:
            batch.set_source_rule_destination_port(num, rd.destination.port)
    _set_groups(batch.set_source_rule_destination_group, num, rd.destination)
    if rd.translation is not None:
        if rd.translation.address:
            batch.set_source_rule_translation_address(num, rd.translation.address)
        if rd.translation.port:
            batch.set_source_rule_translation_port(num, rd.translation.port)


def _recreate_destination_rule(batch: NAT66BatchBuilder, num: int, rd: NAT66RuleData) -> None:
    batch.set_destination_rule(num)
    if rd.description:
        batch.set_destination_rule_description(num, rd.description)
    if rd.disable:
        batch.set_destination_rule_disable(num)
    if rd.exclude:
        batch.set_destination_rule_exclude(num)
    if rd.log:
        batch.set_destination_rule_log(num)
    if rd.protocol:
        batch.set_destination_rule_protocol(num, rd.protocol)
    if rd.inbound_interface:
        batch.set_destination_rule_inbound_interface_name(num, rd.inbound_interface)
    if rd.source is not None:
        if rd.source.address:
            batch.set_destination_rule_source_address(num, rd.source.address)
        if rd.source.port:
            batch.set_destination_rule_source_port(num, rd.source.port)
    _set_groups(batch.set_destination_rule_source_group, num, rd.source)
    if rd.destination is not None:
        if rd.destination.address:
            batch.set_destination_rule_destination_address(num, rd.destination.address)
        if rd.destination.port:
            batch.set_destination_rule_destination_port(num, rd.destination.port)
    _set_groups(batch.set_destination_rule_destination_group, num, rd.destination)
    if rd.translation is not None:
        if rd.translation.address:
            batch.set_destination_rule_translation_address(num, rd.translation.address)
        if rd.translation.port:
            batch.set_destination_rule_translation_port(num, rd.translation.port)


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_nat66_rules(http_request: Request, request: ReorderNAT66Request):
    """
    Reorder NAT66 rules by deleting and recreating them in a single commit.
    """
    await require_write_permission(http_request, FeatureGroup.NAT66)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT66BatchBuilder(version=service.get_version())
        is_source = request.rule_type == "source"

        try:
            # Step 1: delete every old rule; step 2: recreate under the new numbers.
            for item in request.rules:
                if is_source:
                    batch.delete_source_rule(item.old_number)
                else:
                    batch.delete_destination_rule(item.old_number)
            for item in request.rules:
                if item.new_number is None or item.rule_data is None:
                    continue  # delete-only item: removed above, not recreated
                if is_source:
                    _recreate_source_rule(batch, item.new_number, item.rule_data)
                else:
                    _recreate_destination_rule(batch, item.new_number, item.rule_data)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": f"Reordered {len(request.rules)} NAT66 {request.rule_type} rules"} if ok else None,
            error=None if ok else response.error,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
