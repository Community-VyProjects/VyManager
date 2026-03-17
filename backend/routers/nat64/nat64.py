"""
NAT64 Router

API endpoints for managing VyOS NAT64 configuration.
Supports source NAT64 rules with IPv6-to-IPv4 translation pools.
"""

import inspect
import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import NAT64BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat64", tags=["nat64"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# ==================== Request/Response Models ====================

class NAT64BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class NAT64BatchRequest(BaseModel):
    """Model for batch NAT64 rule configuration."""
    rule_number: int = Field(..., description="NAT64 rule number")
    pool_number: Optional[int] = Field(None, description="Translation pool number (for pool operations)")
    operations: List[NAT64BatchOperation] = Field(..., description="List of operations to perform")

    class Config:
        json_schema_extra = {
            "example": {
                "rule_number": 100,
                "operations": [
                    {"op": "set_source_rule"},
                    {"op": "set_source_rule_description", "value": "Translate IPv6 to IPv4"},
                    {"op": "set_source_rule_source_prefix", "value": "64:ff9b::/96"},
                ]
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== Config Response Models ====================

class NAT64TranslationPoolProtocol(BaseModel):
    """Protocol flags for a translation pool."""
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


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int
    new_number: int
    rule_data: Dict[str, Any]


class ReorderNAT64Request(BaseModel):
    """Request model for reordering NAT64 rules."""
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with old and new numbers")


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
        full_config = service.get_full_config(refresh=refresh)

        nat64_config = full_config.get("nat64", {})
        source_config = nat64_config.get("source", {})
        rules_config = source_config.get("rule", {})

        source_rules = []

        for rule_num_str, rule_data in rules_config.items():
            try:
                rule_number = int(rule_num_str)
            except (ValueError, TypeError):
                continue

            # Parse translation pools
            translation_pools = []
            pools_config = rule_data.get("translation", {}).get("pool", {})
            for pool_num_str, pool_data in pools_config.items():
                try:
                    pool_number = int(pool_num_str)
                except (ValueError, TypeError):
                    continue

                # Parse protocol flags
                protocol_config = pool_data.get("protocol", {})
                protocol = None
                if protocol_config:
                    protocol = NAT64TranslationPoolProtocol(
                        tcp="tcp" in protocol_config,
                        udp="udp" in protocol_config,
                        icmp="icmp" in protocol_config,
                    )

                translation_pools.append(NAT64TranslationPool(
                    pool_number=pool_number,
                    address=pool_data.get("address"),
                    description=pool_data.get("description"),
                    disable="disable" in pool_data,
                    port=pool_data.get("port"),
                    protocol=protocol,
                ))

            translation_pools.sort(key=lambda p: p.pool_number)

            # Parse match
            match_config = rule_data.get("match", {})
            match_mark = match_config.get("mark")

            source_rules.append(NAT64SourceRule(
                rule_number=rule_number,
                description=rule_data.get("description"),
                disable="disable" in rule_data,
                match_mark=match_mark,
                source_prefix=rule_data.get("source", {}).get("prefix"),
                translation_pools=translation_pools,
            ))

        source_rules.sort(key=lambda r: r.rule_number)

        return NAT64ConfigResponse(
            source_rules=source_rules,
            total=len(source_rules),
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: NAT64BatchRequest):
    """Execute batch NAT64 operations in a single commit."""
    await require_write_permission(http_request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT64BatchBuilder(version=service.get_version())

        rule_number = request.rule_number
        pool_number = request.pool_number

        for op in request.operations:
            op_name = op.op
            op_value = op.value

            if op_name.startswith("_") or op_name in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {op_name}")

            method = getattr(batch, op_name, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {op_name}")

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != 'self']

            try:
                if len(params) == 1:
                    # rule_number only (e.g., set_source_rule, delete_source_rule)
                    method(rule_number)
                elif len(params) == 2:
                    if "pool_number" in params:
                        # (rule_number, pool_number)
                        if pool_number is None:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Operation {op_name} requires pool_number"
                            )
                        method(rule_number, pool_number)
                    else:
                        # (rule_number, value)
                        if op_value is None:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Operation {op_name} requires a value"
                            )
                        method(rule_number, op_value)
                elif len(params) == 3:
                    # (rule_number, pool_number, value)
                    if pool_number is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires pool_number"
                        )
                    if op_value is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires a value"
                        )
                    method(rule_number, pool_number, op_value)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported operation signature for {op_name}"
                    )
            except HTTPException:
                raise
            except TypeError as e:
                logger.exception(f"Type error calling {op_name}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parameters for operation {op_name}: {str(e)}"
                )

        if batch.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = service.execute_batch(batch)

        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "NAT64 configuration updated successfully"}
        elif not isinstance(result_data, dict):
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


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_nat64_rules(http_request: Request, request: ReorderNAT64Request):
    """
    Reorder NAT64 rules by deleting and recreating them in a single commit.

    Requires: WRITE permission on NAT
    """
    await require_write_permission(http_request, FeatureGroup.NAT64)

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT64BatchBuilder(version=service.get_version())

        # Step 1: Delete all old rules
        for rule_item in request.rules:
            batch.delete_source_rule(rule_item.old_number)

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_num = rule_item.new_number
            rd = rule_item.rule_data

            batch.set_source_rule(new_num)

            if rd.get("description"):
                batch.set_source_rule_description(new_num, rd["description"])
            if rd.get("disable"):
                batch.set_source_rule_disable(new_num)
            if rd.get("match_mark"):
                batch.set_source_rule_match_mark(new_num, rd["match_mark"])
            if rd.get("source_prefix"):
                batch.set_source_rule_source_prefix(new_num, rd["source_prefix"])

            # Recreate translation pools
            for pool in rd.get("translation_pools", []):
                pool_num = pool.get("pool_number")
                if pool_num is None:
                    continue
                batch.set_source_rule_translation_pool(new_num, pool_num)
                if pool.get("address"):
                    batch.set_source_rule_translation_pool_address(new_num, pool_num, pool["address"])
                if pool.get("description"):
                    batch.set_source_rule_translation_pool_description(new_num, pool_num, pool["description"])
                if pool.get("disable"):
                    batch.set_source_rule_translation_pool_disable(new_num, pool_num)
                if pool.get("port"):
                    batch.set_source_rule_translation_pool_port(new_num, pool_num, pool["port"])
                protocol = pool.get("protocol", {})
                if protocol.get("tcp"):
                    batch.set_source_rule_translation_pool_protocol_tcp(new_num, pool_num)
                if protocol.get("udp"):
                    batch.set_source_rule_translation_pool_protocol_udp(new_num, pool_num)
                if protocol.get("icmp"):
                    batch.set_source_rule_translation_pool_protocol_icmp(new_num, pool_num)

        if batch.is_empty():
            return VyOSResponse(success=False, error="No operations to execute")

        response = service.execute_batch(batch)

        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": f"Reordered {len(request.rules)} NAT64 rules"}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": f"Reordered {len(request.rules)} NAT64 rules"}
        else:
            result_data["message"] = f"Reordered {len(request.rules)} NAT64 rules"

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
