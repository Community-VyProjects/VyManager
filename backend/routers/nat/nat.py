"""
NAT Router

API endpoints for managing VyOS NAT configuration.
Supports source NAT, destination NAT, and static NAT rules.
"""

import logging

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import NATBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/nat", tags=["nat"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
})


# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# Request/Response Models
class NATBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class NATBatchRequest(BaseModel):
    """Model for batch NAT rule configuration."""
    rule_number: Optional[int] = Field(None, description="NAT rule number (for source/destination/static/cgnat rules)")
    item_name: Optional[str] = Field(None, description="Item name (for CGNAT pool operations)")
    nat_type: str = Field(..., description="NAT type: source, destination, static, or cgnat")
    operations: List[NATBatchOperation] = Field(..., description="List of operations to perform")

    class Config:
        json_schema_extra = {
            "example": {
                "rule_number": 100,
                "nat_type": "source",
                "operations": [
                    {"op": "set_source_rule"},
                    {"op": "set_source_rule_description", "value": "Masquerade LAN"},
                    {"op": "set_source_rule_outbound_interface_name", "value": "eth0"},
                    {"op": "set_source_rule_source_address", "value": "192.168.1.0/24"},
                    {"op": "set_source_rule_translation_address", "value": "masquerade"}
                ]
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ReorderRuleItem(BaseModel):
    """Single rule item for reordering."""
    old_number: int
    new_number: int
    rule_data: Dict[str, Any]


class ReorderNATRequest(BaseModel):
    """Request model for reordering NAT rules."""
    nat_type: str = Field(..., description="NAT type: source, destination, static, or cgnat")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with their old and new numbers")


class NATRuleSource(BaseModel):
    """Source configuration for NAT rule."""
    address: Optional[str] = None
    fqdn: Optional[str] = None
    port: Optional[str] = None
    group: Optional[Dict[str, str]] = None  # {type: name}


class NATRuleDestination(BaseModel):
    """Destination configuration for NAT rule."""
    address: Optional[str] = None
    fqdn: Optional[str] = None
    port: Optional[str] = None
    group: Optional[Dict[str, str]] = None  # {type: name}


class NATRuleTranslationOptions(BaseModel):
    """Translation options configuration."""
    address_mapping: Optional[str] = None
    port_mapping: Optional[str] = None


class NATRuleTranslationRedirect(BaseModel):
    """Translation redirect configuration."""
    port: Optional[str] = None


class NATRuleTranslation(BaseModel):
    """Translation configuration for NAT rule."""
    address: Optional[str] = None
    port: Optional[str] = None
    options: Optional[NATRuleTranslationOptions] = None
    redirect: Optional[NATRuleTranslationRedirect] = None


class NATRuleLoadBalanceBackend(BaseModel):
    """Load balance backend with optional weight."""
    name: str
    weight: Optional[str] = None


class NATRuleLoadBalance(BaseModel):
    """Load balance configuration for NAT rule."""
    hash: Optional[str] = None
    backends: List[NATRuleLoadBalanceBackend] = []


class SourceNATRule(BaseModel):
    """Source NAT rule configuration."""
    rule_number: int
    description: Optional[str] = None
    source: Optional[NATRuleSource] = None
    destination: Optional[NATRuleDestination] = None
    outbound_interface: Optional[Dict[str, str]] = None  # {type: value}, type is "name" or "group"
    protocol: Optional[str] = None
    packet_type: Optional[str] = None
    translation: Optional[NATRuleTranslation] = None
    load_balance: Optional[NATRuleLoadBalance] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False


class DestinationNATRule(BaseModel):
    """Destination NAT rule configuration."""
    rule_number: int
    description: Optional[str] = None
    source: Optional[NATRuleSource] = None
    destination: Optional[NATRuleDestination] = None
    inbound_interface: Optional[Dict[str, str]] = None  # {type: value}, type is "name" or "group"
    protocol: Optional[str] = None
    packet_type: Optional[str] = None
    translation: Optional[NATRuleTranslation] = None
    load_balance: Optional[NATRuleLoadBalance] = None
    disable: bool = False
    exclude: bool = False
    log: bool = False


class StaticNATRule(BaseModel):
    """Static NAT rule configuration."""
    rule_number: int
    description: Optional[str] = None
    destination: Optional[Dict[str, str]] = None  # {address: value}
    inbound_interface: Optional[str] = None
    translation: Optional[Dict[str, str]] = None  # {address: value}
    log: bool = False


class CGNATExternalPoolRange(BaseModel):
    """CGNAT external pool range entry."""
    range: str
    seq: Optional[str] = None


class CGNATExternalPool(BaseModel):
    """CGNAT external pool configuration."""
    name: str
    external_port_range: Optional[str] = None
    per_user_limit_port: Optional[str] = None
    ranges: List[CGNATExternalPoolRange] = []


class CGNATInternalPool(BaseModel):
    """CGNAT internal pool configuration."""
    name: str
    ranges: List[str] = []


class CGNATRule(BaseModel):
    """CGNAT rule configuration."""
    rule_number: int
    source_pool: Optional[str] = None
    translation_pool: Optional[str] = None


class CGNATConfig(BaseModel):
    """CGNAT configuration."""
    log_allocation: bool = False
    external_pools: List[CGNATExternalPool] = []
    internal_pools: List[CGNATInternalPool] = []
    rules: List[CGNATRule] = []


class NATConfigResponse(BaseModel):
    """Response containing all NAT configurations."""
    source_rules: List[SourceNATRule] = []
    destination_rules: List[DestinationNATRule] = []
    static_rules: List[StaticNATRule] = []
    cgnat: Optional[CGNATConfig] = None
    total: int = 0
    by_type: Dict[str, int] = {}


def _parse_load_balance(rule_data: Dict[str, Any]) -> Optional[NATRuleLoadBalance]:
    """Parse load-balance config from rule data."""
    if "load-balance" not in rule_data:
        return None
    lb_data = rule_data["load-balance"]
    backends = []
    if "backend" in lb_data:
        if isinstance(lb_data["backend"], dict):
            for name, backend_data in lb_data["backend"].items():
                weight = None
                if isinstance(backend_data, dict):
                    weight = backend_data.get("weight")
                backends.append(NATRuleLoadBalanceBackend(name=name, weight=str(weight) if weight else None))
        elif isinstance(lb_data["backend"], str):
            backends.append(NATRuleLoadBalanceBackend(name=lb_data["backend"]))
    return NATRuleLoadBalance(
        hash=lb_data.get("hash"),
        backends=backends
    )


@router.get("/capabilities")
async def get_nat_capabilities(request: Request):
    """
    Get NAT capabilities based on device VyOS version.

    Returns feature flags indicating which NAT types and operations are supported.
    This allows frontends to conditionally enable/disable features based on version.

    Requires: READ permission on NAT
    """
    # Check permission
    await require_read_permission(request, FeatureGroup.NAT)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = NATBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=NATConfigResponse)
async def get_nat_config(http_request: Request, refresh: bool = False):
    """
    Get all NAT configurations from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all NAT rules organized by type

    Requires: READ permission on NAT
    """
    # Check permission
    await require_read_permission(http_request, FeatureGroup.NAT)

    try:
        # Get service and retrieve raw config from cache
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "nat" not in full_config:
            return NATConfigResponse(total=0)

        nat_config = full_config["nat"]

        source_rules = []
        destination_rules = []
        static_rules = []

        # Parse Source NAT rules
        if "source" in nat_config and "rule" in nat_config["source"]:
            for rule_num, rule_data in nat_config["source"]["rule"].items():
                source = None
                if "source" in rule_data:
                    source = NATRuleSource(
                        address=rule_data["source"].get("address"),
                        fqdn=rule_data["source"].get("fqdn"),
                        port=rule_data["source"].get("port"),
                        group=rule_data["source"].get("group")
                    )

                destination = None
                if "destination" in rule_data:
                    destination = NATRuleDestination(
                        address=rule_data["destination"].get("address"),
                        fqdn=rule_data["destination"].get("fqdn"),
                        port=rule_data["destination"].get("port"),
                        group=rule_data["destination"].get("group")
                    )

                outbound_interface = None
                if "outbound-interface" in rule_data:
                    outbound_interface = rule_data["outbound-interface"]

                translation = None
                if "translation" in rule_data:
                    trans_data = rule_data["translation"]
                    options = None
                    if "options" in trans_data:
                        options = NATRuleTranslationOptions(
                            address_mapping=trans_data["options"].get("address-mapping"),
                            port_mapping=trans_data["options"].get("port-mapping")
                        )
                    translation = NATRuleTranslation(
                        address=trans_data.get("address"),
                        port=trans_data.get("port"),
                        options=options,
                    )

                load_balance = _parse_load_balance(rule_data)

                rule = SourceNATRule(
                    rule_number=int(rule_num),
                    description=rule_data.get("description"),
                    source=source,
                    destination=destination,
                    outbound_interface=outbound_interface,
                    protocol=rule_data.get("protocol"),
                    packet_type=rule_data.get("packet-type"),
                    translation=translation,
                    load_balance=load_balance,
                    disable="disable" in rule_data,
                    exclude="exclude" in rule_data,
                    log="log" in rule_data
                )
                source_rules.append(rule)

        # Parse Destination NAT rules
        if "destination" in nat_config and "rule" in nat_config["destination"]:
            for rule_num, rule_data in nat_config["destination"]["rule"].items():
                source = None
                if "source" in rule_data:
                    source = NATRuleSource(
                        address=rule_data["source"].get("address"),
                        fqdn=rule_data["source"].get("fqdn"),
                        port=rule_data["source"].get("port"),
                        group=rule_data["source"].get("group")
                    )

                destination = None
                if "destination" in rule_data:
                    destination = NATRuleDestination(
                        address=rule_data["destination"].get("address"),
                        fqdn=rule_data["destination"].get("fqdn"),
                        port=rule_data["destination"].get("port"),
                        group=rule_data["destination"].get("group")
                    )

                inbound_interface = None
                if "inbound-interface" in rule_data:
                    inbound_interface = rule_data["inbound-interface"]

                translation = None
                if "translation" in rule_data:
                    trans_data = rule_data["translation"]
                    options = None
                    if "options" in trans_data:
                        options = NATRuleTranslationOptions(
                            address_mapping=trans_data["options"].get("address-mapping")
                        )
                    redirect = None
                    if "redirect" in trans_data:
                        redirect = NATRuleTranslationRedirect(
                            port=trans_data["redirect"].get("port")
                        )
                    translation = NATRuleTranslation(
                        address=trans_data.get("address"),
                        port=trans_data.get("port"),
                        options=options,
                        redirect=redirect,
                    )

                load_balance = _parse_load_balance(rule_data)

                rule = DestinationNATRule(
                    rule_number=int(rule_num),
                    description=rule_data.get("description"),
                    source=source,
                    destination=destination,
                    inbound_interface=inbound_interface,
                    protocol=rule_data.get("protocol"),
                    packet_type=rule_data.get("packet-type"),
                    translation=translation,
                    load_balance=load_balance,
                    disable="disable" in rule_data,
                    exclude="exclude" in rule_data,
                    log="log" in rule_data
                )
                destination_rules.append(rule)

        # Parse Static NAT rules
        if "static" in nat_config and "rule" in nat_config["static"]:
            for rule_num, rule_data in nat_config["static"]["rule"].items():
                destination = None
                if "destination" in rule_data:
                    destination = {"address": rule_data["destination"].get("address")}

                translation = None
                if "translation" in rule_data:
                    translation = {"address": rule_data["translation"].get("address")}

                rule = StaticNATRule(
                    rule_number=int(rule_num),
                    description=rule_data.get("description"),
                    destination=destination,
                    inbound_interface=rule_data.get("inbound-interface"),
                    translation=translation,
                    log="log" in rule_data
                )
                static_rules.append(rule)

        # Parse CGNAT config (VyOS 1.5+)
        cgnat_config = None
        if "cgnat" in nat_config:
            cgnat_data = nat_config["cgnat"]
            external_pools = []
            internal_pools = []
            cgnat_rules = []

            # Parse external pools
            if "pool" in cgnat_data and "external" in cgnat_data["pool"]:
                for pool_name, pool_data in cgnat_data["pool"]["external"].items():
                    if not isinstance(pool_data, dict):
                        continue
                    ranges = []
                    if "range" in pool_data and isinstance(pool_data["range"], dict):
                        for range_val, range_data in pool_data["range"].items():
                            seq = None
                            if isinstance(range_data, dict):
                                seq = range_data.get("seq")
                                if seq is not None:
                                    seq = str(seq)
                            ranges.append(CGNATExternalPoolRange(range=range_val, seq=seq))
                    ext_port_range = pool_data.get("external-port-range")
                    per_user_port = None
                    if "per-user-limit" in pool_data and isinstance(pool_data["per-user-limit"], dict):
                        per_user_port = pool_data["per-user-limit"].get("port")
                        if per_user_port is not None:
                            per_user_port = str(per_user_port)
                    external_pools.append(CGNATExternalPool(
                        name=pool_name,
                        external_port_range=str(ext_port_range) if ext_port_range else None,
                        per_user_limit_port=per_user_port,
                        ranges=ranges,
                    ))

            # Parse internal pools
            if "pool" in cgnat_data and "internal" in cgnat_data["pool"]:
                for pool_name, pool_data in cgnat_data["pool"]["internal"].items():
                    if not isinstance(pool_data, dict):
                        continue
                    ranges = []
                    if "range" in pool_data:
                        if isinstance(pool_data["range"], list):
                            ranges = pool_data["range"]
                        elif isinstance(pool_data["range"], str):
                            ranges = [pool_data["range"]]
                    internal_pools.append(CGNATInternalPool(
                        name=pool_name,
                        ranges=ranges,
                    ))

            # Parse CGNAT rules
            if "rule" in cgnat_data and isinstance(cgnat_data["rule"], dict):
                for rule_num, rule_data in cgnat_data["rule"].items():
                    if not isinstance(rule_data, dict):
                        continue
                    source_pool = None
                    if "source" in rule_data and isinstance(rule_data["source"], dict):
                        source_pool = rule_data["source"].get("pool")
                    translation_pool = None
                    if "translation" in rule_data and isinstance(rule_data["translation"], dict):
                        translation_pool = rule_data["translation"].get("pool")
                    cgnat_rules.append(CGNATRule(
                        rule_number=int(rule_num),
                        source_pool=source_pool,
                        translation_pool=translation_pool,
                    ))

            cgnat_rules.sort(key=lambda x: x.rule_number)

            cgnat_config = CGNATConfig(
                log_allocation="log-allocation" in cgnat_data,
                external_pools=external_pools,
                internal_pools=internal_pools,
                rules=cgnat_rules,
            )

        # Sort rules by rule number
        source_rules.sort(key=lambda x: x.rule_number)
        destination_rules.sort(key=lambda x: x.rule_number)
        static_rules.sort(key=lambda x: x.rule_number)

        # Calculate totals
        cgnat_rule_count = len(cgnat_config.rules) if cgnat_config else 0
        total = len(source_rules) + len(destination_rules) + len(static_rules) + cgnat_rule_count
        by_type = {
            "source": len(source_rules),
            "destination": len(destination_rules),
            "static": len(static_rules),
            "cgnat": cgnat_rule_count,
        }

        return NATConfigResponse(
            source_rules=source_rules,
            destination_rules=destination_rules,
            static_rules=static_rules,
            cgnat=cgnat_config,
            total=total,
            by_type=by_type
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure_nat(http_request: Request, request: NATBatchRequest):
    """
    Execute batch NAT operations.

    This endpoint allows configuring NAT rules through a series of operations.
    All operations are executed in a single transaction.

    Args:
        request: Batch request containing rule number, NAT type, and operations

    Returns:
        VyOSResponse with success/failure information

    Requires: WRITE permission on NAT
    """
    # Check permission
    await require_write_permission(http_request, FeatureGroup.NAT)

    try:
        import inspect

        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Create NAT batch builder
        batch = NATBatchBuilder(version=version)

        # Determine the primary identifier based on request
        # For source/destination/static: rule_number (int)
        # For CGNAT pool ops: item_name (str)
        # For CGNAT rule ops: rule_number (int)
        # For CGNAT global ops (log-allocation): no identifier
        primary_id = request.rule_number if request.rule_number is not None else request.item_name

        # Map operations to batch builder methods
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value

            logger.info(f"Processing operation: {op_name} with value: {op_value}")

            # Get the method from batch builder
            if op_name.startswith("_") or op_name in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(status_code=400, detail=f"Invalid operation: {op_name}")
            method = getattr(batch, op_name, None)
            if not callable(method):
                raise HTTPException(status_code=400, detail=f"Unknown operation: {op_name}")

            # Inspect method signature to determine parameters
            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != 'self']

            logger.info(f"Method {op_name} expects parameters: {params}")

            # Call the method with appropriate parameters
            try:
                if len(params) == 0:
                    # Method takes no parameters (e.g., set_cgnat_log_allocation)
                    method()
                elif len(params) == 1:
                    # Method takes one parameter (rule_number or pool_name)
                    if primary_id is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires rule_number or item_name"
                        )
                    method(primary_id)
                elif len(params) == 2:
                    # Method takes two parameters (identifier + value)
                    if primary_id is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires rule_number or item_name"
                        )
                    if op_value is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires a value"
                        )
                    method(primary_id, op_value)
                elif len(params) == 3:
                    # Method takes three parameters (identifier + 2 values)
                    # Value is a JSON dict with 2 values
                    import json
                    if primary_id is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires rule_number or item_name"
                        )
                    try:
                        value_dict = json.loads(op_value) if isinstance(op_value, str) else op_value
                        if isinstance(value_dict, dict) and len(value_dict) >= 2:
                            values = list(value_dict.values())
                            method(primary_id, values[0], values[1])
                        else:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Operation {op_name} requires a dict with at least 2 values"
                            )
                    except json.JSONDecodeError:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid JSON value for operation {op_name}"
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported parameter count for operation {op_name}: {len(params)}"
                    )
            except TypeError as te:
                logger.error(f"TypeError calling {op_name}: {str(te)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parameters for operation {op_name}: {str(te)}"
                )

        if batch.is_empty():
            return VyOSResponse(
                success=False,
                error="No operations to execute"
            )

        # Execute the batch
        response = service.execute_batch(batch)

        # Handle empty string result (convert to None for Pydantic validation)
        identifier = request.rule_number if request.rule_number is not None else request.item_name
        msg = f"Configured NAT {request.nat_type} {identifier}"
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": msg}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": msg}
        else:
            result_data["message"] = msg

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_nat_rules(http_request: Request, request: ReorderNATRequest):
    """
    Reorder NAT rules by deleting and recreating them in a single commit.

    This endpoint efficiently reorders multiple NAT rules by:
    1. Deleting all specified rules
    2. Recreating them with new rule numbers
    All operations are executed in a single VyOS commit.

    Args:
        request: Reorder request containing NAT type and list of rules

    Returns:
        VyOSResponse with success/failure information

    Requires: WRITE permission on NAT
    """
    # Check permission
    await require_write_permission(http_request, FeatureGroup.NAT)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Create NAT batch builder
        batch = NATBatchBuilder(version=version)

        # Step 1: Delete all old rules
        for rule_item in request.rules:
            if request.nat_type == "source":
                batch.delete_source_rule(rule_item.old_number)
            elif request.nat_type == "destination":
                batch.delete_destination_rule(rule_item.old_number)
            elif request.nat_type == "static":
                batch.delete_static_rule(rule_item.old_number)
            elif request.nat_type == "cgnat":
                batch.delete_cgnat_rule(rule_item.old_number)

        # Step 2: Create all rules with new numbers
        for rule_item in request.rules:
            new_num = rule_item.new_number
            rule_data = rule_item.rule_data

            if request.nat_type == "source":
                # Create source rule
                batch.set_source_rule(new_num)

                # Add all rule properties
                if rule_data.get("description"):
                    batch.set_source_rule_description(new_num, rule_data["description"])
                if rule_data.get("source_address"):
                    batch.set_source_rule_source_address(new_num, rule_data["source_address"])
                if rule_data.get("source_fqdn"):
                    batch.set_source_rule_source_fqdn(new_num, rule_data["source_fqdn"])
                if rule_data.get("source_port"):
                    batch.set_source_rule_source_port(new_num, rule_data["source_port"])
                if rule_data.get("destination_address"):
                    batch.set_source_rule_destination_address(new_num, rule_data["destination_address"])
                if rule_data.get("destination_fqdn"):
                    batch.set_source_rule_destination_fqdn(new_num, rule_data["destination_fqdn"])
                if rule_data.get("destination_port"):
                    batch.set_source_rule_destination_port(new_num, rule_data["destination_port"])
                if rule_data.get("outbound_interface_name"):
                    batch.set_source_rule_outbound_interface_name(new_num, rule_data["outbound_interface_name"])
                if rule_data.get("outbound_interface_group"):
                    batch.set_source_rule_outbound_interface_group(new_num, rule_data["outbound_interface_group"])
                if rule_data.get("protocol"):
                    batch.set_source_rule_protocol(new_num, rule_data["protocol"])
                if rule_data.get("packet_type"):
                    batch.set_source_rule_packet_type(new_num, rule_data["packet_type"])
                if rule_data.get("translation_address"):
                    batch.set_source_rule_translation_address(new_num, rule_data["translation_address"])
                if rule_data.get("translation_port"):
                    batch.set_source_rule_translation_port(new_num, rule_data["translation_port"])
                if rule_data.get("translation_options_address_mapping"):
                    batch.set_source_rule_translation_options_address_mapping(new_num, rule_data["translation_options_address_mapping"])
                if rule_data.get("translation_options_port_mapping"):
                    batch.set_source_rule_translation_options_port_mapping(new_num, rule_data["translation_options_port_mapping"])
                # Source groups
                if rule_data.get("source_group"):
                    for gtype, gname in rule_data["source_group"].items():
                        batch.set_source_rule_source_group(new_num, gtype, gname)
                # Destination groups
                if rule_data.get("destination_group"):
                    for gtype, gname in rule_data["destination_group"].items():
                        batch.set_source_rule_destination_group(new_num, gtype, gname)
                # Load balance
                if rule_data.get("load_balance_hash"):
                    batch.set_source_rule_load_balance_hash(new_num, rule_data["load_balance_hash"])
                if rule_data.get("load_balance_backends"):
                    for backend in rule_data["load_balance_backends"]:
                        batch.set_source_rule_load_balance_backend(new_num, backend["name"])
                        if backend.get("weight"):
                            batch.set_source_rule_load_balance_backend_weight(new_num, backend["name"], backend["weight"])
                if rule_data.get("disable"):
                    batch.set_source_rule_disable(new_num)
                if rule_data.get("exclude"):
                    batch.set_source_rule_exclude(new_num)
                if rule_data.get("log"):
                    batch.set_source_rule_log(new_num)

            elif request.nat_type == "destination":
                # Create destination rule
                batch.set_destination_rule(new_num)

                # Add all rule properties
                if rule_data.get("description"):
                    batch.set_destination_rule_description(new_num, rule_data["description"])
                if rule_data.get("source_address"):
                    batch.set_destination_rule_source_address(new_num, rule_data["source_address"])
                if rule_data.get("source_fqdn"):
                    batch.set_destination_rule_source_fqdn(new_num, rule_data["source_fqdn"])
                if rule_data.get("source_port"):
                    batch.set_destination_rule_source_port(new_num, rule_data["source_port"])
                if rule_data.get("destination_address"):
                    batch.set_destination_rule_destination_address(new_num, rule_data["destination_address"])
                if rule_data.get("destination_fqdn"):
                    batch.set_destination_rule_destination_fqdn(new_num, rule_data["destination_fqdn"])
                if rule_data.get("destination_port"):
                    batch.set_destination_rule_destination_port(new_num, rule_data["destination_port"])
                if rule_data.get("inbound_interface_name"):
                    batch.set_destination_rule_inbound_interface_name(new_num, rule_data["inbound_interface_name"])
                if rule_data.get("inbound_interface_group"):
                    batch.set_destination_rule_inbound_interface_group(new_num, rule_data["inbound_interface_group"])
                if rule_data.get("protocol"):
                    batch.set_destination_rule_protocol(new_num, rule_data["protocol"])
                if rule_data.get("packet_type"):
                    batch.set_destination_rule_packet_type(new_num, rule_data["packet_type"])
                if rule_data.get("translation_address"):
                    batch.set_destination_rule_translation_address(new_num, rule_data["translation_address"])
                if rule_data.get("translation_port"):
                    batch.set_destination_rule_translation_port(new_num, rule_data["translation_port"])
                if rule_data.get("translation_options_address_mapping"):
                    batch.set_destination_rule_translation_options_address_mapping(new_num, rule_data["translation_options_address_mapping"])
                if rule_data.get("translation_redirect_port"):
                    batch.set_destination_rule_translation_redirect_port(new_num, rule_data["translation_redirect_port"])
                # Source groups
                if rule_data.get("source_group"):
                    for gtype, gname in rule_data["source_group"].items():
                        batch.set_destination_rule_source_group(new_num, gtype, gname)
                # Destination groups
                if rule_data.get("destination_group"):
                    for gtype, gname in rule_data["destination_group"].items():
                        batch.set_destination_rule_destination_group(new_num, gtype, gname)
                # Load balance
                if rule_data.get("load_balance_hash"):
                    batch.set_destination_rule_load_balance_hash(new_num, rule_data["load_balance_hash"])
                if rule_data.get("load_balance_backends"):
                    for backend in rule_data["load_balance_backends"]:
                        batch.set_destination_rule_load_balance_backend(new_num, backend["name"])
                        if backend.get("weight"):
                            batch.set_destination_rule_load_balance_backend_weight(new_num, backend["name"], backend["weight"])
                if rule_data.get("disable"):
                    batch.set_destination_rule_disable(new_num)
                if rule_data.get("exclude"):
                    batch.set_destination_rule_exclude(new_num)
                if rule_data.get("log"):
                    batch.set_destination_rule_log(new_num)

            elif request.nat_type == "static":
                # Create static rule
                batch.set_static_rule(new_num)

                # Add all rule properties
                if rule_data.get("description"):
                    batch.set_static_rule_description(new_num, rule_data["description"])
                if rule_data.get("destination_address"):
                    batch.set_static_rule_destination_address(new_num, rule_data["destination_address"])
                if rule_data.get("inbound_interface"):
                    batch.set_static_rule_inbound_interface(new_num, rule_data["inbound_interface"])
                if rule_data.get("translation_address"):
                    batch.set_static_rule_translation_address(new_num, rule_data["translation_address"])
                if rule_data.get("log"):
                    batch.set_static_rule_log(new_num)

            elif request.nat_type == "cgnat":
                # Create CGNAT rule
                batch.set_cgnat_rule(new_num)

                if rule_data.get("source_pool"):
                    batch.set_cgnat_rule_source_pool(new_num, rule_data["source_pool"])
                if rule_data.get("translation_pool"):
                    batch.set_cgnat_rule_translation_pool(new_num, rule_data["translation_pool"])

        if batch.is_empty():
            return VyOSResponse(
                success=False,
                error="No operations to execute"
            )

        # Execute the entire batch in a single commit
        response = service.execute_batch(batch)

        # Handle response
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": f"Reordered {len(request.rules)} {request.nat_type} NAT rules"}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": f"Reordered {len(request.rules)} {request.nat_type} NAT rules"}
        else:
            result_data["message"] = f"Reordered {len(request.rules)} {request.nat_type} NAT rules"

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
