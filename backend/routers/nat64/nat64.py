"""
NAT64 Router

API endpoints for managing VyOS NAT64 configuration.
Supports source NAT64 rules with IPv6-to-IPv4 translation pools.
"""

import logging
from typing import Any, Dict, List, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.concurrency import run_in_threadpool

from batch_dispatch import call_item_batch_op
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from session_vyos_service import get_session_vyos_service
from vyos_builders.nat64 import NAT64BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat64 import NAT64Mapper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat64", tags=["nat64"])

# ``nat64 source rule`` and ``translation pool`` tags: u32 1-999999 on both labs.
NUMBER_MIN = 1
NUMBER_MAX = 999999


# ==================== Request/Response Models ====================

class NAT64BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class NAT64BatchRequest(BaseModel):
    """Model for batch NAT64 rule configuration."""
    rule_number: int = Field(..., ge=NUMBER_MIN, le=NUMBER_MAX, description="NAT64 rule number")
    pool_number: Optional[int] = Field(
        None, ge=NUMBER_MIN, le=NUMBER_MAX, description="Translation pool number (for pool operations)"
    )
    operations: List[NAT64BatchOperation] = Field(..., description="List of operations to perform")

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "rule_number": 100,
            "operations": [
                {"op": "set_source_rule"},
                {"op": "set_source_rule_description", "value": "Translate IPv6 to IPv4"},
                {"op": "set_source_rule_source_prefix", "value": "64:ff9b::/96"},
            ]
        }
    })


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== Config Response Models ====================

class NAT64TranslationPoolProtocol(BaseModel):
    """Protocol flags for a translation pool."""
    model_config = ConfigDict(extra="forbid")
    tcp: bool = False
    udp: bool = False
    icmp: bool = False


class NAT64TranslationPool(BaseModel):
    """Translation pool within a NAT64 rule."""
    pool_number: int
    address: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    port: Optional[str] = None
    protocol: Optional[NAT64TranslationPoolProtocol] = None


class NAT64SourceRule(BaseModel):
    """NAT64 source rule configuration."""
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    match_mark: Optional[str] = None
    source_prefix: Optional[str] = None
    translation_pools: List[NAT64TranslationPool] = []


class NAT64ConfigResponse(BaseModel):
    """Full NAT64 configuration response."""
    source_rules: List[NAT64SourceRule] = []
    total: int = 0


class NAT64PoolData(BaseModel):
    """One translation pool of a recreated rule (the reorder body)."""
    model_config = ConfigDict(extra="forbid")
    pool_number: int = Field(..., ge=NUMBER_MIN, le=NUMBER_MAX)
    address: Optional[str] = None
    description: Optional[str] = None
    disable: bool = False
    port: Optional[str] = None
    protocol: Optional[NAT64TranslationPoolProtocol] = None


class NAT64RuleData(BaseModel):
    """Leaves of one rule, without its number (the reorder body)."""
    model_config = ConfigDict(extra="forbid")
    description: Optional[str] = None
    disable: bool = False
    match_mark: Optional[str] = None
    source_prefix: Optional[str] = None
    translation_pools: List[NAT64PoolData] = []

    @model_validator(mode="after")
    def _unique_pools(self) -> "NAT64RuleData":
        numbers = [pool.pool_number for pool in self.translation_pools]
        if len(set(numbers)) != len(numbers):
            raise ValueError("duplicate pool_number")
        return self


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int = Field(..., ge=NUMBER_MIN, le=NUMBER_MAX)
    new_number: Optional[int] = Field(None, ge=NUMBER_MIN, le=NUMBER_MAX)  # None = delete-only
    rule_data: Optional[NAT64RuleData] = None

    @model_validator(mode="after")
    def _data_for_recreated_rule(self) -> "ReorderRuleItem":
        if self.new_number is not None and self.rule_data is None:
            raise ValueError("rule_data is required when new_number is set")
        return self


class ReorderNAT64Request(BaseModel):
    """Request model for reordering NAT64 rules."""
    rules: List[ReorderRuleItem] = Field(..., min_length=1, description="Rules with old and new numbers")

    @model_validator(mode="after")
    def _unique_numbers(self) -> "ReorderNAT64Request":
        old = [item.old_number for item in self.rules]
        new = [item.new_number for item in self.rules if item.new_number is not None]
        if len(set(old)) != len(old):
            raise ValueError("duplicate old_number")
        if len(set(new)) != len(new):
            raise ValueError("duplicate new_number")
        return self


# ==================== Endpoints ====================

@router.get("/capabilities")
async def get_capabilities(request: Request):
    """Get NAT64 capabilities for the current VyOS version."""
    await require_read_permission(request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = NAT64BatchBuilder(version=version)
        return builder.get_capabilities()
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=NAT64ConfigResponse)
async def get_config(request: Request, refresh: bool = False):
    """Get current NAT64 configuration."""
    await require_read_permission(request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        mapper = cast(NAT64Mapper, CommandMapperRegistry.get_mapper("nat64", version))
        return NAT64ConfigResponse(**mapper.parse_config(full_config))

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: NAT64BatchRequest):
    """Execute batch NAT64 operations in a single commit.

    Each op names a builder method. The first parameter is bound to
    ``rule_number`` and a ``pool_number`` parameter to the request's
    ``pool_number``; a remaining parameter takes ``value``. A rule-only or
    pool-only op takes no value, and a rule op takes no ``pool_number``.
    """
    await require_write_permission(http_request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT64BatchBuilder(version=service.get_version())

        for operation in request.operations:
            call_item_batch_op(
                batch,
                operation.op,
                request.rule_number,
                operation.value,
                bound={"pool_number": request.pool_number},
            )

        if batch.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": "NAT64 configuration updated"} if ok else None,
            error=None if ok else response.error,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


def _recreate_rule(batch: NAT64BatchBuilder, num: int, rd: NAT64RuleData) -> None:
    batch.set_source_rule(num)
    if rd.description:
        batch.set_source_rule_description(num, rd.description)
    if rd.disable:
        batch.set_source_rule_disable(num)
    if rd.match_mark:
        batch.set_source_rule_match_mark(num, rd.match_mark)
    if rd.source_prefix:
        batch.set_source_rule_source_prefix(num, rd.source_prefix)

    for pool in rd.translation_pools:
        pool_num = pool.pool_number
        batch.set_source_rule_translation_pool(num, pool_num)
        if pool.address:
            batch.set_source_rule_translation_pool_address(num, pool_num, pool.address)
        if pool.description:
            batch.set_source_rule_translation_pool_description(num, pool_num, pool.description)
        if pool.disable:
            batch.set_source_rule_translation_pool_disable(num, pool_num)
        if pool.port:
            batch.set_source_rule_translation_pool_port(num, pool_num, pool.port)
        if pool.protocol is not None:
            if pool.protocol.tcp:
                batch.set_source_rule_translation_pool_protocol_tcp(num, pool_num)
            if pool.protocol.udp:
                batch.set_source_rule_translation_pool_protocol_udp(num, pool_num)
            if pool.protocol.icmp:
                batch.set_source_rule_translation_pool_protocol_icmp(num, pool_num)


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_nat64_rules(http_request: Request, request: ReorderNAT64Request):
    """
    Reorder NAT64 rules by deleting and recreating them in a single commit.
    """
    await require_write_permission(http_request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT64BatchBuilder(version=service.get_version())

        # Step 1: delete every old rule; step 2: recreate under the new numbers.
        for item in request.rules:
            batch.delete_source_rule(item.old_number)
        for item in request.rules:
            if item.new_number is None or item.rule_data is None:
                continue  # delete-only item: removed above, not recreated
            _recreate_rule(batch, item.new_number, item.rule_data)

        response = await run_in_threadpool(service.execute_batch, batch)
        ok = response.status == 200 and not response.error

        return VyOSResponse(
            success=ok,
            data={"message": f"Reordered {len(request.rules)} NAT64 rules"} if ok else None,
            error=None if ok else response.error,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
