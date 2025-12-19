"""
Local Route Router

API endpoints for managing VyOS local route policy configuration.
Supports both IPv4 (local-route) and IPv6 (local-route6) rules.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import LocalRouteBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/local-route", tags=["local-route"])

# Stub functions for backwards compatibility with app.py
def set_device_registry(registry):
    """Legacy function - no longer used."""
    pass


def set_configured_device_name(name):
    """Legacy function - no longer used."""
    pass


# ============================================================================
# Pydantic Models
# ============================================================================


class LocalRouteRule(BaseModel):
    """Model for a local route rule (IPv4 or IPv6)."""

    rule_number: int = Field(..., ge=1, le=32765, description="Rule number (1-32765)")
    source: Optional[str] = Field(None, description="Source address or prefix")
    destination: Optional[str] = Field(None, description="Destination address or prefix")
    inbound_interface: Optional[str] = Field(None, description="Inbound interface name")
    table: Optional[str] = Field(None, description="Routing table (1-200 or 'main')")
    vrf: Optional[str] = Field(None, description="VRF instance name (VyOS 1.5+ only)")


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
    rule_type: str = Field(..., description="Rule type: 'ipv4' or 'ipv6'")
    operations: List[LocalRouteBatchOperation]


class LocalRouteReorderRequest(BaseModel):
    """Model for reordering rules."""

    rule_type: str = Field(..., description="Rule type: 'ipv4' or 'ipv6'")
    rules: List[Dict[str, Any]] = Field(
        ..., description="List of rules with old and new numbers"
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities", response_model=LocalRouteCapabilitiesResponse)
async def get_local_route_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


def parse_address_field(value):
    """
    Parse VyOS address field which can be:
    - A string: "10.2.4.5"
    - A dict with 'address' key: {'address': ['10.2.4.5']}
    - None
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and "address" in value:
        # VyOS returns {'address': ['10.2.4.5']}
        addresses = value["address"]
        if isinstance(addresses, list) and len(addresses) > 0:
            return addresses[0]
    return None


@router.get("/config", response_model=LocalRouteConfigResponse)
async def get_local_route_config(http_request: Request, refresh: bool = False):
    """
    Get all local route configurations in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data for IPv4 and IPv6 rules
    """
    try:
        service = get_session_vyos_service(http_request)
        full_config = service.get_full_config(refresh=refresh)

        ipv4_rules = []
        ipv6_rules = []

        # Parse IPv4 local-route rules
        if "policy" in full_config and "local-route" in full_config["policy"]:
            local_route_config = full_config["policy"]["local-route"]
            if "rule" in local_route_config:
                for rule_num_str, rule_data in local_route_config["rule"].items():
                    rule = LocalRouteRule(
                        rule_number=int(rule_num_str),
                        source=parse_address_field(rule_data.get("source")),
                        destination=parse_address_field(rule_data.get("destination")),
                        inbound_interface=rule_data.get("inbound-interface"),
                        table=rule_data.get("set", {}).get("table") if "set" in rule_data else None,
                        vrf=rule_data.get("set", {}).get("vrf") if "set" in rule_data else None,
                    )
                    ipv4_rules.append(rule)

        # Parse IPv6 local-route6 rules
        if "policy" in full_config and "local-route6" in full_config["policy"]:
            local_route6_config = full_config["policy"]["local-route6"]
            if "rule" in local_route6_config:
                for rule_num_str, rule_data in local_route6_config["rule"].items():
                    rule = LocalRouteRule(
                        rule_number=int(rule_num_str),
                        source=parse_address_field(rule_data.get("source")),
                        destination=parse_address_field(rule_data.get("destination")),
                        inbound_interface=rule_data.get("inbound-interface"),
                        table=rule_data.get("set", {}).get("table") if "set" in rule_data else None,
                        vrf=rule_data.get("set", {}).get("vrf") if "set" in rule_data else None,
                    )
                    ipv6_rules.append(rule)

        # Sort by rule number
        ipv4_rules.sort(key=lambda x: x.rule_number)
        ipv6_rules.sort(key=lambda x: x.rule_number)

        return LocalRouteConfigResponse(
            ipv4_rules=ipv4_rules,
            ipv6_rules=ipv6_rules,
            total_ipv4=len(ipv4_rules),
            total_ipv6=len(ipv6_rules),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def local_route_batch_configure(request: LocalRouteBatchRequest):
    """
    Execute a batch of configuration operations for a local route rule.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []
            if "rule_number" in params:
                args.append(request.rule_number)
            if operation.value and len(params) > len(args):
                args.append(operation.value)

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 4: Reorder Rules
# ============================================================================


@router.post("/reorder")
async def local_route_reorder_rules(request: LocalRouteReorderRequest):
    """
    Reorder local route rules by renumbering them.

    This is done by deleting all rules and recreating them with new numbers
    in a single batch operation.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LocalRouteBatchBuilder(version=version)

        # Determine operation prefix based on rule type
        if request.rule_type == "ipv4":
            delete_op = "delete_local_route_rule"
            create_op = "set_local_route_rule"
            source_op = "set_local_route_rule_source"
            dest_op = "set_local_route_rule_destination"
            interface_op = "set_local_route_rule_inbound_interface"
            table_op = "set_local_route_rule_set_table"
            vrf_op = "set_local_route_rule_set_vrf"
        else:  # ipv6
            delete_op = "delete_local_route6_rule"
            create_op = "set_local_route6_rule"
            source_op = "set_local_route6_rule_source"
            dest_op = "set_local_route6_rule_destination"
            interface_op = "set_local_route6_rule_inbound_interface"
            table_op = "set_local_route6_rule_set_table"
            vrf_op = "set_local_route6_rule_set_vrf"

        # Step 1: Delete all rules in reverse order
        old_numbers = [rule["old_number"] for rule in request.rules]
        for old_num in sorted(old_numbers, reverse=True):
            getattr(builder, delete_op)(old_num)

        # Step 2: Recreate rules with new numbers
        for rule in request.rules:
            new_num = rule["new_number"]
            rule_data = rule["rule_data"]

            # Create rule
            getattr(builder, create_op)(new_num)

            # Set properties
            if rule_data.get("source"):
                getattr(builder, source_op)(new_num, rule_data["source"])
            if rule_data.get("destination"):
                getattr(builder, dest_op)(new_num, rule_data["destination"])
            if rule_data.get("inbound_interface"):
                getattr(builder, interface_op)(new_num, rule_data["inbound_interface"])
            if rule_data.get("table"):
                getattr(builder, table_op)(new_num, rule_data["table"])
            if rule_data.get("vrf"):
                getattr(builder, vrf_op)(new_num, rule_data["vrf"])

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Rules reordered successfully"},
            error=response.error if response.error else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
