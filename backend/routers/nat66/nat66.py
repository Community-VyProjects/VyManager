"""
NAT66 Router

API endpoints for managing VyOS NAT66 configuration.
Supports source and destination NAT66 rules for IPv6-to-IPv6 translation.
"""

import inspect
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import NAT66BatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat66", tags=["nat66"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


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
    group: Optional[NAT66RuleGroup] = None


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


# ==================== Helper Functions ====================

def _parse_group(group_config: dict) -> Optional[NAT66RuleGroup]:
    """Parse group config from VyOS JSON into NAT66RuleGroup."""
    if not group_config:
        return None
    group = NAT66RuleGroup(
        address_group=group_config.get("address-group"),
        domain_group=group_config.get("domain-group"),
        mac_group=group_config.get("mac-group"),
        network_group=group_config.get("network-group"),
        port_group=group_config.get("port-group"),
    )
    # Only return if at least one field is set
    if any([group.address_group, group.domain_group, group.mac_group,
            group.network_group, group.port_group]):
        return group
    return None


def _parse_source_rules(rules_config: dict) -> List[NAT66SourceRule]:
    """Parse source rules from VyOS config JSON."""
    source_rules = []
    for rule_num_str, rule_data in rules_config.items():
        try:
            rule_number = int(rule_num_str)
        except (ValueError, TypeError):
            continue

        source_config = rule_data.get("source", {})
        dest_config = rule_data.get("destination", {})
        translation_config = rule_data.get("translation", {})

        source = NAT66RuleSource(
            prefix=source_config.get("prefix"),
            port=source_config.get("port"),
            group=_parse_group(source_config.get("group", {})),
        ) if source_config else None

        destination = NAT66RuleDestination(
            prefix=dest_config.get("prefix"),
            port=dest_config.get("port"),
            group=_parse_group(dest_config.get("group", {})),
        ) if dest_config else None

        translation = NAT66RuleTranslation(
            address=translation_config.get("address"),
            port=translation_config.get("port"),
        ) if translation_config else None

        outbound_iface = rule_data.get("outbound-interface", {})

        source_rules.append(NAT66SourceRule(
            rule_number=rule_number,
            description=rule_data.get("description"),
            disable="disable" in rule_data,
            exclude="exclude" in rule_data,
            log="log" in rule_data,
            protocol=rule_data.get("protocol"),
            outbound_interface=outbound_iface.get("name") if isinstance(outbound_iface, dict) else None,
            source=source,
            destination=destination,
            translation=translation,
        ))

    source_rules.sort(key=lambda r: r.rule_number)
    return source_rules


def _parse_destination_rules(rules_config: dict) -> List[NAT66DestinationRule]:
    """Parse destination rules from VyOS config JSON."""
    dest_rules = []
    for rule_num_str, rule_data in rules_config.items():
        try:
            rule_number = int(rule_num_str)
        except (ValueError, TypeError):
            continue

        source_config = rule_data.get("source", {})
        dest_config = rule_data.get("destination", {})
        translation_config = rule_data.get("translation", {})

        source = NAT66RuleSource(
            address=source_config.get("address"),
            port=source_config.get("port"),
            group=_parse_group(source_config.get("group", {})),
        ) if source_config else None

        destination = NAT66RuleDestination(
            address=dest_config.get("address"),
            port=dest_config.get("port"),
            group=_parse_group(dest_config.get("group", {})),
        ) if dest_config else None

        translation = NAT66RuleTranslation(
            address=translation_config.get("address"),
            port=translation_config.get("port"),
        ) if translation_config else None

        inbound_iface = rule_data.get("inbound-interface", {})

        dest_rules.append(NAT66DestinationRule(
            rule_number=rule_number,
            description=rule_data.get("description"),
            disable="disable" in rule_data,
            exclude="exclude" in rule_data,
            log="log" in rule_data,
            protocol=rule_data.get("protocol"),
            inbound_interface=inbound_iface.get("name") if isinstance(inbound_iface, dict) else None,
            source=source,
            destination=destination,
            translation=translation,
        ))

    dest_rules.sort(key=lambda r: r.rule_number)
    return dest_rules


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
        full_config = service.get_full_config(refresh=refresh)

        nat66_config = full_config.get("nat66", {})
        source_config = nat66_config.get("source", {}).get("rule", {})
        dest_config = nat66_config.get("destination", {}).get("rule", {})

        source_rules = _parse_source_rules(source_config)
        destination_rules = _parse_destination_rules(dest_config)

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

            if op_name.startswith("_") or op_name in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {op_name}")

            # Validate operation matches rule_type
            if request.rule_type == "source" and op_name.startswith("set_destination_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use destination operation on source rule: {op_name}")
            if request.rule_type == "source" and op_name.startswith("delete_destination_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use destination operation on source rule: {op_name}")
            if request.rule_type == "destination" and op_name.startswith("set_source_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use source operation on destination rule: {op_name}")
            if request.rule_type == "destination" and op_name.startswith("delete_source_rule"):
                raise HTTPException(status_code=400, detail=f"Cannot use source operation on destination rule: {op_name}")

            method = getattr(batch, op_name, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {op_name}")

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != 'self']

            try:
                if len(params) == 1:
                    method(rule_number)
                elif len(params) == 2 and op_value is not None:
                    method(rule_number, op_value)
                elif len(params) == 2 and op_value is None:
                    raise HTTPException(status_code=400, detail=f"Operation {op_name} requires a value")
                elif len(params) == 3 and op_value is not None:
                    # For group operations: (rule_number, group_type, value)
                    # The group_type is embedded in the op_name, and value has format "group_type:value"
                    parts = op_value.split(":", 1)
                    if len(parts) == 2:
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

        response = service.execute_batch(batch)

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
