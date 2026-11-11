"""
NAT66 Router

API endpoints for managing VyOS NAT66 configuration.
Supports source and destination NAT66 rules for IPv6-to-IPv6 translation.
"""

import inspect
import logging

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, cast
from session_vyos_service import get_session_vyos_service
from vyos_builders.nat66 import NAT66BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.nat66 import NAT66Mapper
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from batch_dispatch import resolve_batch_method

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat66", tags=["nat66"])


# ==================== Request/Response Models ====================

class NAT66BatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class NAT66BatchRequest(BaseModel):
    """Model for batch NAT66 rule configuration."""
    rule_number: int = Field(..., description="NAT66 rule number")
    rule_type: str = Field(..., description="Rule type: 'source' or 'destination'")
    operations: List[NAT66BatchOperation] = Field(..., description="List of operations to perform")

    class Config:
        json_schema_extra = {
            "example": {
                "rule_number": 100,
                "rule_type": "source",
                "operations": [
                    {"op": "set_source_rule"},
                    {"op": "set_source_rule_description", "value": "IPv6 masquerade"},
                    {"op": "set_source_rule_outbound_interface_name", "value": "eth0"},
                    {"op": "set_source_rule_translation_address", "value": "masquerade"},
                ]
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ==================== Config Response Models ====================

class NAT66RuleGroup(BaseModel):
    """Firewall group references on a rule (VyOS 1.5 only)."""
    address_group: Optional[str] = None
    domain_group: Optional[str] = None
    mac_group: Optional[str] = None
    network_group: Optional[str] = None
    port_group: Optional[str] = None


class NAT66RuleSource(BaseModel):
    """Source match criteria for a NAT66 rule."""
    address: Optional[str] = None
    prefix: Optional[str] = None
    port: Optional[str] = None


class NAT66RuleDestination(BaseModel):
    """Destination match criteria for a NAT66 rule."""
    address: Optional[str] = None
    prefix: Optional[str] = None
    port: Optional[str] = None
    group: Optional[NAT66RuleGroup] = None


class NAT66RuleTranslation(BaseModel):
    """Translation configuration for a NAT66 rule."""
    address: Optional[str] = None
    port: Optional[str] = None


class NAT66SourceRule(BaseModel):
    """NAT66 source rule configuration."""
    rule_number: int
    description: Optional[str] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False
    protocol: Optional[str] = None
    outbound_interface: Optional[str] = None
    source: Optional[NAT66RuleSource] = None
    destination: Optional[NAT66RuleDestination] = None
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
    source: Optional[NAT66RuleSource] = None
    destination: Optional[NAT66RuleDestination] = None
    translation: Optional[NAT66RuleTranslation] = None


class NAT66ConfigResponse(BaseModel):
    """Full NAT66 configuration response."""
    source_rules: List[NAT66SourceRule] = []
    destination_rules: List[NAT66DestinationRule] = []
    total: int = 0


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int
    new_number: Optional[int] = None  # None = delete-only (removed, not recreated)
    rule_data: Dict[str, Any]


class ReorderNAT66Request(BaseModel):
    """Request model for reordering NAT66 rules."""
    rule_type: str = Field(..., description="Rule type: 'source' or 'destination'")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with old and new numbers")


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
        parsed = mapper.parse_config(full_config)
        source_rules = [NAT66SourceRule(**rule) for rule in parsed["source_rules"]]
        destination_rules = [NAT66DestinationRule(**rule) for rule in parsed["destination_rules"]]

        return NAT66ConfigResponse(
            source_rules=source_rules,
            destination_rules=destination_rules,
            total=len(source_rules) + len(destination_rules),
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure(http_request: Request, request: NAT66BatchRequest):
    """Execute batch NAT66 operations in a single commit."""
    await require_write_permission(http_request, FeatureGroup.NAT66)

    if request.rule_type not in ("source", "destination"):
        raise HTTPException(status_code=400, detail="rule_type must be 'source' or 'destination'")

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT66BatchBuilder(version=service.get_version())

        rule_number = request.rule_number

        for op in request.operations:
            op_name = op.op
            op_value = op.value


            # Validate operation matches rule_type
            if request.rule_type == "source" and op_name.startswith("set_destination_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use destination operation on source rule: {op_name}")
            if request.rule_type == "source" and op_name.startswith("delete_destination_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use destination operation on source rule: {op_name}")
            if request.rule_type == "destination" and op_name.startswith("set_source_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use source operation on destination rule: {op_name}")
            if request.rule_type == "destination" and op_name.startswith("delete_source_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use source operation on destination rule: {op_name}")

            method = resolve_batch_method(batch, op_name)

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != 'self']

            try:
                if len(params) == 1:
                    method(rule_number)
                elif len(params) == 2 and op_value:
                    method(rule_number, op_value)
                elif len(params) == 2:
                    raise HTTPException(status_code=400, detail=f"Operation {op_name} requires a value")
                elif len(params) == 3 and op_value:
                    parts = op_value.split(":", 1)
                    if len(parts) == 2 and parts[0] and parts[1]:
                        method(rule_number, parts[0], parts[1])
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires value in format 'group_type:value'"
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported operation signature for {op_name}"
                    )
            except HTTPException:
                raise
            except TypeError:
                logger.exception("Type error calling %s", op_name)
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parameters for operation {op_name}",
                )

        if batch.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, batch)

        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "NAT66 configuration updated successfully"}
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
async def reorder_nat66_rules(http_request: Request, request: ReorderNAT66Request):
    """
    Reorder NAT66 rules by deleting and recreating them in a single commit.
    """
    await require_write_permission(http_request, FeatureGroup.NAT66)

    if request.rule_type not in ("source", "destination"):
        raise HTTPException(status_code=400, detail="rule_type must be 'source' or 'destination'")

    try:
        service = get_session_vyos_service(http_request)
        batch = NAT66BatchBuilder(version=service.get_version())

        is_source = request.rule_type == "source"

        # Step 1: Delete all old rules
        for rule_item in request.rules:
            if is_source:
                batch.delete_source_rule(rule_item.old_number)
            else:
                batch.delete_destination_rule(rule_item.old_number)

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_num = rule_item.new_number
            if new_num is None:
                continue  # delete-only item: removed above, not recreated
            rd = rule_item.rule_data

            if is_source:
                batch.set_source_rule(new_num)
                if rd.get("description"):
                    batch.set_source_rule_description(new_num, rd["description"])
                if rd.get("disable"):
                    batch.set_source_rule_disable(new_num)
                if rd.get("exclude"):
                    batch.set_source_rule_exclude(new_num)
                if rd.get("log"):
                    batch.set_source_rule_log(new_num)
                if rd.get("protocol"):
                    batch.set_source_rule_protocol(new_num, rd["protocol"])
                if rd.get("outbound_interface"):
                    batch.set_source_rule_outbound_interface_name(new_num, rd["outbound_interface"])
                # Source
                if rd.get("source_prefix"):
                    batch.set_source_rule_source_prefix(new_num, rd["source_prefix"])
                if rd.get("source_port"):
                    batch.set_source_rule_source_port(new_num, rd["source_port"])
                # Destination
                if rd.get("destination_prefix"):
                    batch.set_source_rule_destination_prefix(new_num, rd["destination_prefix"])
                if rd.get("destination_port"):
                    batch.set_source_rule_destination_port(new_num, rd["destination_port"])
                # Translation
                if rd.get("translation_address"):
                    batch.set_source_rule_translation_address(new_num, rd["translation_address"])
                if rd.get("translation_port"):
                    batch.set_source_rule_translation_port(new_num, rd["translation_port"])
            else:
                batch.set_destination_rule(new_num)
                if rd.get("description"):
                    batch.set_destination_rule_description(new_num, rd["description"])
                if rd.get("disable"):
                    batch.set_destination_rule_disable(new_num)
                if rd.get("exclude"):
                    batch.set_destination_rule_exclude(new_num)
                if rd.get("log"):
                    batch.set_destination_rule_log(new_num)
                if rd.get("protocol"):
                    batch.set_destination_rule_protocol(new_num, rd["protocol"])
                if rd.get("inbound_interface"):
                    batch.set_destination_rule_inbound_interface_name(new_num, rd["inbound_interface"])
                # Source
                if rd.get("source_address"):
                    batch.set_destination_rule_source_address(new_num, rd["source_address"])
                if rd.get("source_port"):
                    batch.set_destination_rule_source_port(new_num, rd["source_port"])
                # Destination
                if rd.get("destination_address"):
                    batch.set_destination_rule_destination_address(new_num, rd["destination_address"])
                if rd.get("destination_port"):
                    batch.set_destination_rule_destination_port(new_num, rd["destination_port"])
                # Translation
                if rd.get("translation_address"):
                    batch.set_destination_rule_translation_address(new_num, rd["translation_address"])
                if rd.get("translation_port"):
                    batch.set_destination_rule_translation_port(new_num, rd["translation_port"])

        if batch.is_empty():
            return VyOSResponse(success=False, error="No operations to execute")

        response = await run_in_threadpool(service.execute_batch, batch)

        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": f"Reordered {len(request.rules)} NAT66 {request.rule_type} rules"}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": f"Reordered {len(request.rules)} NAT66 {request.rule_type} rules"}
        else:
            result_data["message"] = f"Reordered {len(request.rules)} NAT66 {request.rule_type} rules"

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
