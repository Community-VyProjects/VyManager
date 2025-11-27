"""
NAT Router

API endpoints for managing VyOS NAT configuration.
Supports source NAT, destination NAT, and static NAT rules.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from vyos_service import VyOSDeviceRegistry
from vyos_builders import NATBatchBuilder

router = APIRouter(prefix="/vyos/nat", tags=["nat"])

# Module-level variables for device registry and configured device name
device_registry: VyOSDeviceRegistry = None
CONFIGURED_DEVICE_NAME: Optional[str] = None


def set_device_registry(registry: VyOSDeviceRegistry):
    """Set the device registry for this router."""
    global device_registry
    device_registry = registry


def set_configured_device_name(name: str):
    """Set the configured device name for this router."""
    global CONFIGURED_DEVICE_NAME
    CONFIGURED_DEVICE_NAME = name


# Request/Response Models
class NATBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class NATBatchRequest(BaseModel):
    """Model for batch NAT rule configuration."""
    rule_number: int = Field(..., description="NAT rule number")
    nat_type: str = Field(..., description="NAT type: source, destination, or static")
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
    nat_type: str = Field(..., description="NAT type: source, destination, or static")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with their old and new numbers")


class NATRuleSource(BaseModel):
    """Source configuration for NAT rule."""
    address: Optional[str] = None
    port: Optional[str] = None
    group: Optional[Dict[str, str]] = None  # {type: name}


class NATRuleDestination(BaseModel):
    """Destination configuration for NAT rule."""
    address: Optional[str] = None
    port: Optional[str] = None
    group: Optional[Dict[str, str]] = None  # {type: name}


class NATRuleTranslation(BaseModel):
    """Translation configuration for NAT rule."""
    address: Optional[str] = None
    port: Optional[str] = None


class NATRuleLoadBalance(BaseModel):
    """Load balance configuration for NAT rule."""
    hash: Optional[str] = None
    backend: List[str] = []


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


class NATConfigResponse(BaseModel):
    """Response containing all NAT configurations."""
    source_rules: List[SourceNATRule] = []
    destination_rules: List[DestinationNATRule] = []
    static_rules: List[StaticNATRule] = []
    total: int = 0
    by_type: Dict[str, int] = {}


@router.get("/capabilities")
async def get_nat_capabilities():
    """
    Get NAT capabilities based on device VyOS version.

    Returns feature flags indicating which NAT types and operations are supported.
    This allows frontends to conditionally enable/disable features based on version.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = NATBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add device info
        capabilities["device_name"] = CONFIGURED_DEVICE_NAME

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=NATConfigResponse)
async def get_nat_config(refresh: bool = False):
    """
    Get all NAT configurations from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all NAT rules organized by type
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        # Get service and retrieve raw config from cache
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        full_config = service.get_full_config(refresh=refresh)

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
                        port=rule_data["source"].get("port"),
                        group=rule_data["source"].get("group")
                    )

                destination = None
                if "destination" in rule_data:
                    destination = NATRuleDestination(
                        address=rule_data["destination"].get("address"),
                        port=rule_data["destination"].get("port"),
                        group=rule_data["destination"].get("group")
                    )

                outbound_interface = None
                if "outbound-interface" in rule_data:
                    outbound_interface = rule_data["outbound-interface"]

                translation = None
                if "translation" in rule_data:
                    translation = NATRuleTranslation(
                        address=rule_data["translation"].get("address"),
                        port=rule_data["translation"].get("port")
                    )

                load_balance = None
                if "load-balance" in rule_data:
                    lb_data = rule_data["load-balance"]
                    backends = []
                    if "backend" in lb_data:
                        # backend can be a dict of backends
                        if isinstance(lb_data["backend"], dict):
                            backends = list(lb_data["backend"].keys())
                        elif isinstance(lb_data["backend"], str):
                            backends = [lb_data["backend"]]
                    load_balance = NATRuleLoadBalance(
                        hash=lb_data.get("hash"),
                        backend=backends
                    )

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
                        port=rule_data["source"].get("port"),
                        group=rule_data["source"].get("group")
                    )

                destination = None
                if "destination" in rule_data:
                    destination = NATRuleDestination(
                        address=rule_data["destination"].get("address"),
                        port=rule_data["destination"].get("port"),
                        group=rule_data["destination"].get("group")
                    )

                inbound_interface = None
                if "inbound-interface" in rule_data:
                    inbound_interface = rule_data["inbound-interface"]

                translation = None
                if "translation" in rule_data:
                    translation = NATRuleTranslation(
                        address=rule_data["translation"].get("address"),
                        port=rule_data["translation"].get("port")
                    )

                load_balance = None
                if "load-balance" in rule_data:
                    lb_data = rule_data["load-balance"]
                    backends = []
                    if "backend" in lb_data:
                        # backend can be a dict of backends
                        if isinstance(lb_data["backend"], dict):
                            backends = list(lb_data["backend"].keys())
                        elif isinstance(lb_data["backend"], str):
                            backends = [lb_data["backend"]]
                    load_balance = NATRuleLoadBalance(
                        hash=lb_data.get("hash"),
                        backend=backends
                    )

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
                    translation=translation
                )
                static_rules.append(rule)

        # Sort rules by rule number
        source_rules.sort(key=lambda x: x.rule_number)
        destination_rules.sort(key=lambda x: x.rule_number)
        static_rules.sort(key=lambda x: x.rule_number)

        # Calculate totals
        total = len(source_rules) + len(destination_rules) + len(static_rules)
        by_type = {
            "source": len(source_rules),
            "destination": len(destination_rules),
            "static": len(static_rules)
        }

        return NATConfigResponse(
            source_rules=source_rules,
            destination_rules=destination_rules,
            static_rules=static_rules,
            total=total,
            by_type=by_type
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=VyOSResponse)
async def batch_configure_nat(request: NATBatchRequest):
    """
    Execute batch NAT operations.

    This endpoint allows configuring NAT rules through a series of operations.
    All operations are executed in a single transaction.

    Args:
        request: Batch request containing rule number, NAT type, and operations

    Returns:
        VyOSResponse with success/failure information
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        import inspect
        import logging

        logger = logging.getLogger(__name__)

        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()

        # Create NAT batch builder
        batch = NATBatchBuilder(version=version)

        # Map operations to batch builder methods
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value

            logger.info(f"Processing operation: {op_name} with value: {op_value}")

            # Get the method from batch builder
            if not hasattr(batch, op_name):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {op_name}"
                )

            method = getattr(batch, op_name)

            # Inspect method signature to determine parameters
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Remove 'self' from params list
            if 'self' in params:
                params.remove('self')

            logger.info(f"Method {op_name} expects parameters: {params}")

            # Call the method with appropriate parameters
            try:
                if len(params) == 0:
                    # Method takes no parameters
                    method()
                elif len(params) == 1:
                    # Method takes one parameter (rule_number)
                    method(request.rule_number)
                elif len(params) == 2:
                    # Method takes two parameters (rule_number, value)
                    if op_value is None:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Operation {op_name} requires a value"
                        )
                    method(request.rule_number, op_value)
                elif len(params) == 3:
                    # Method takes three parameters (rule_number, param1, param2)
                    # This is typically for group operations
                    import json
                    try:
                        value_dict = json.loads(op_value) if isinstance(op_value, str) else op_value
                        if isinstance(value_dict, dict) and len(value_dict) >= 2:
                            # Extract the two values from the dict
                            values = list(value_dict.values())
                            method(request.rule_number, values[0], values[1])
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
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": f"Configured NAT rule {request.rule_number}"}
        elif not isinstance(result_data, dict):
            # If it's not a dict and not empty, wrap it
            result_data = {"result": result_data, "message": f"Configured NAT rule {request.rule_number}"}
        else:
            result_data["message"] = f"Configured NAT rule {request.rule_number}"

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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reorder", response_model=VyOSResponse)
async def reorder_nat_rules(request: ReorderNATRequest):
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
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )

    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
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
                if rule_data.get("source_port"):
                    batch.set_source_rule_source_port(new_num, rule_data["source_port"])
                if rule_data.get("destination_address"):
                    batch.set_source_rule_destination_address(new_num, rule_data["destination_address"])
                if rule_data.get("destination_port"):
                    batch.set_source_rule_destination_port(new_num, rule_data["destination_port"])
                if rule_data.get("outbound_interface_name"):
                    batch.set_source_rule_outbound_interface_name(new_num, rule_data["outbound_interface_name"])
                if rule_data.get("protocol"):
                    batch.set_source_rule_protocol(new_num, rule_data["protocol"])
                if rule_data.get("packet_type"):
                    batch.set_source_rule_packet_type(new_num, rule_data["packet_type"])
                if rule_data.get("translation_address"):
                    batch.set_source_rule_translation_address(new_num, rule_data["translation_address"])
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
                if rule_data.get("source_port"):
                    batch.set_destination_rule_source_port(new_num, rule_data["source_port"])
                if rule_data.get("destination_address"):
                    batch.set_destination_rule_destination_address(new_num, rule_data["destination_address"])
                if rule_data.get("destination_port"):
                    batch.set_destination_rule_destination_port(new_num, rule_data["destination_port"])
                if rule_data.get("inbound_interface_name"):
                    batch.set_destination_rule_inbound_interface_name(new_num, rule_data["inbound_interface_name"])
                if rule_data.get("protocol"):
                    batch.set_destination_rule_protocol(new_num, rule_data["protocol"])
                if rule_data.get("packet_type"):
                    batch.set_destination_rule_packet_type(new_num, rule_data["packet_type"])
                if rule_data.get("translation_address"):
                    batch.set_destination_rule_translation_address(new_num, rule_data["translation_address"])
                if rule_data.get("translation_port"):
                    batch.set_destination_rule_translation_port(new_num, rule_data["translation_port"])
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
                    batch.set_static_rule_destination(new_num, rule_data["destination_address"])
                if rule_data.get("inbound_interface"):
                    batch.set_static_rule_inbound_interface(new_num, rule_data["inbound_interface"])
                if rule_data.get("translation_address"):
                    batch.set_static_rule_translation(new_num, rule_data["translation_address"])

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
        raise HTTPException(status_code=500, detail=str(e))
