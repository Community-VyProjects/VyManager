"""
Access List Router

API endpoints for managing VyOS access-list configuration.
Supports both IPv4 (access-list) and IPv6 (access-list6) with version-aware configuration.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from vyos_service import VyOSDeviceRegistry
from vyos_builders import AccessListBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/access-list", tags=["access-list"])

# Module-level variables for device registry
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


# ============================================================================
# Pydantic Models
# ============================================================================


class AccessListRule(BaseModel):
    """Model for an access-list rule."""
    rule_number: int
    action: str  # permit or deny
    description: Optional[str] = None
    source_type: Optional[str] = None  # any, host, inverse-mask, network
    source_address: Optional[str] = None
    source_mask: Optional[str] = None
    source_exact_match: Optional[bool] = None  # IPv6 exact-match flag
    destination_type: Optional[str] = None  # any, host, inverse-mask, network
    destination_address: Optional[str] = None
    destination_mask: Optional[str] = None


class AccessList(BaseModel):
    """Model for an access-list."""
    number: str  # For IPv4, name for IPv6
    description: Optional[str] = None
    rules: List[AccessListRule] = []
    list_type: str  # ipv4 or ipv6


class AccessListConfigResponse(BaseModel):
    """Response containing all access-list configuration."""
    ipv4_lists: List[AccessList] = []
    ipv6_lists: List[AccessList] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class AccessListBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")
    value2: Optional[str] = Field(None, description="Second value (for inverse-mask, network)")


class AccessListBatchRequest(BaseModel):
    """Model for batch configuration."""
    identifier: str = Field(..., description="Access list number (IPv4) or name (IPv6)")
    list_type: str = Field(..., description="ipv4 or ipv6")
    rule_number: Optional[int] = Field(None, description="Rule number for rule operations")
    operations: List[AccessListBatchOperation]


class ReorderRuleItem(BaseModel):
    """Model for a single rule in reorder request."""
    old_number: int
    new_number: int
    rule_data: AccessListRule


class ReorderAccessListRequest(BaseModel):
    """Model for reordering rules in an access-list."""
    identifier: str = Field(..., description="Access list number (IPv4) or name (IPv6)")
    list_type: str = Field(..., description="ipv4 or ipv6")
    rules: List[ReorderRuleItem]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_access_list_capabilities():
    """
    Get feature capabilities based on device VyOS version.
    
    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured. Check .env file."
        )
    
    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = AccessListBatchBuilder(version=version)
        capabilities = builder.get_capabilities()
        
        capabilities["device_name"] = CONFIGURED_DEVICE_NAME
        return capabilities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 2: Config (Generalized Data)
# ============================================================================


@router.get("/config", response_model=AccessListConfigResponse)
async def get_access_list_config(refresh: bool = False):
    """
    Get all access-list configurations from VyOS in a generalized format.
    
    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.
    
    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(
            status_code=503, detail="No device configured."
        )
    
    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        full_config = service.get_full_config(refresh=refresh)
        
        ipv4_lists = []
        ipv6_lists = []
        
        # Parse IPv4 access-lists
        policy_config = full_config.get("policy", {})
        access_lists = policy_config.get("access-list", {})
        
        for number, list_config in access_lists.items():
            rules = []
            rules_config = list_config.get("rule", {})
            
            for rule_num, rule_config in rules_config.items():
                # Parse source
                source_type = None
                source_address = None
                source_mask = None
                source_data = rule_config.get("source", {})

                if isinstance(source_data, dict):
                    if "any" in source_data:
                        source_type = "any"
                    elif "host" in source_data:
                        source_type = "host"
                        host_val = source_data.get("host")
                        source_address = host_val if isinstance(host_val, str) else None
                    elif "inverse-mask" in source_data and "network" in source_data:
                        # Inverse-mask format: {'inverse-mask': '0.0.0.255', 'network': '192.168.80.0'}
                        source_type = "inverse-mask"
                        source_address = source_data.get("network")
                        source_mask = source_data.get("inverse-mask")
                    elif "network" in source_data:
                        source_type = "network"
                        net_data = source_data.get("network", {})
                        if isinstance(net_data, str):
                            # Direct value (e.g., IPv6 CIDR)
                            source_address = net_data
                        elif isinstance(net_data, dict):
                            # Nested structure: address -> mask -> {}
                            for key, value in net_data.items():
                                source_address = key
                                if isinstance(value, dict) and value:
                                    source_mask = list(value.keys())[0]
                                break  # Only take first entry

                # Parse destination
                dest_type = None
                dest_address = None
                dest_mask = None
                dest_data = rule_config.get("destination", {})

                if isinstance(dest_data, dict):
                    if "any" in dest_data:
                        dest_type = "any"
                    elif "host" in dest_data:
                        dest_type = "host"
                        host_val = dest_data.get("host")
                        dest_address = host_val if isinstance(host_val, str) else None
                    elif "inverse-mask" in dest_data and "network" in dest_data:
                        # Inverse-mask format: {'inverse-mask': '0.0.0.255', 'network': '192.168.80.0'}
                        dest_type = "inverse-mask"
                        dest_address = dest_data.get("network")
                        dest_mask = dest_data.get("inverse-mask")
                    elif "network" in dest_data:
                        dest_type = "network"
                        net_data = dest_data.get("network", {})
                        if isinstance(net_data, str):
                            # Direct value (e.g., IPv6 CIDR)
                            dest_address = net_data
                        elif isinstance(net_data, dict):
                            # Nested structure: address -> mask -> {}
                            for key, value in net_data.items():
                                dest_address = key
                                if isinstance(value, dict) and value:
                                    dest_mask = list(value.keys())[0]
                                break  # Only take first entry
                
                rule = AccessListRule(
                    rule_number=int(rule_num),
                    action=rule_config.get("action", "permit"),
                    description=rule_config.get("description"),
                    source_type=source_type,
                    source_address=source_address,
                    source_mask=source_mask,
                    destination_type=dest_type,
                    destination_address=dest_address,
                    destination_mask=dest_mask,
                )
                rules.append(rule)
            
            # Sort rules by rule number
            rules.sort(key=lambda r: r.rule_number)
            
            access_list = AccessList(
                number=number,
                description=list_config.get("description"),
                rules=rules,
                list_type="ipv4",
            )
            ipv4_lists.append(access_list)
        
        # Parse IPv6 access-lists
        access_lists6 = policy_config.get("access-list6", {})
        
        for name, list_config in access_lists6.items():
            rules = []
            rules_config = list_config.get("rule", {})
            
            for rule_num, rule_config in rules_config.items():
                # Parse source (IPv6 supports any, exact-match, and network)
                # Note: any can coexist with exact-match OR network
                # But exact-match and network are mutually exclusive
                source_type = None
                source_address = None
                source_exact_match = False
                source_data = rule_config.get("source", {})

                if isinstance(source_data, dict):
                    # Check for "any" flag
                    if "any" in source_data:
                        source_type = "any"

                    # Check for "exact-match" flag (can coexist with any)
                    if "exact-match" in source_data:
                        source_exact_match = True

                    # Check for "network" (can coexist with any, but not exact-match)
                    if "network" in source_data:
                        net_val = source_data.get("network")
                        source_address = net_val if isinstance(net_val, str) else None
                        # If we have network but no "any", set source_type to "network"
                        if not source_type:
                            source_type = "network"

                # NOTE: IPv6 access-lists do NOT have destination fields
                # They only match on source

                rule = AccessListRule(
                    rule_number=int(rule_num),
                    action=rule_config.get("action", "permit"),
                    description=rule_config.get("description"),
                    source_type=source_type,
                    source_address=source_address,
                    source_exact_match=source_exact_match,  # Store exact-match flag
                    destination_type=None,  # IPv6 doesn't have destination
                    destination_address=None,  # IPv6 doesn't have destination
                )
                rules.append(rule)
            
            # Sort rules by rule number
            rules.sort(key=lambda r: r.rule_number)
            
            access_list = AccessList(
                number=name,
                description=list_config.get("description"),
                rules=rules,
                list_type="ipv6",
            )
            ipv6_lists.append(access_list)
        
        # Sort access lists by number/name
        ipv4_lists.sort(key=lambda al: int(al.number) if al.number.isdigit() else 0)
        ipv6_lists.sort(key=lambda al: al.number)
        
        return AccessListConfigResponse(
            ipv4_lists=ipv4_lists,
            ipv6_lists=ipv6_lists,
            total_ipv4=len(ipv4_lists),
            total_ipv6=len(ipv6_lists),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def access_list_batch_configure(request: AccessListBatchRequest):
    """
    Execute a batch of configuration operations.
    
    Allows multiple changes in a single VyOS commit for efficiency.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(status_code=503, detail="No device configured.")
    
    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = AccessListBatchBuilder(version=version)
        
        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add identifier (number for IPv4, name for IPv6)
            if "number" in params or "name" in params:
                args.append(request.identifier)

            # Add rule number if present in method signature
            if "rule" in params and request.rule_number is not None:
                args.append(str(request.rule_number))

            # Add operation values
            if operation.value and len(params) > len(args):
                args.append(operation.value)

            if operation.value2 and len(params) > len(args):
                args.append(operation.value2)

            print(f"DEBUG: Calling {operation.op} with args: {args}")
            method(*args)

        # Debug: Print all operations before executing
        operations_list = builder.get_operations()
        print(f"DEBUG: Total operations to execute: {len(operations_list)}")
        for idx, op in enumerate(operations_list):
            print(f"DEBUG: Operation {idx}: {op}")

        # Execute batch
        response = service.execute_batch(builder)

        print(f"DEBUG: VyOS response status: {response.status}")
        print(f"DEBUG: VyOS response error: {response.error}")

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Additional Helper Endpoints
# ============================================================================
# All operations use the batch endpoint above
# No direct DELETE endpoints - use /batch for all operations
# ============================================================================


# ============================================================================
# Reorder Endpoint
# ============================================================================


@router.post("/reorder")
async def reorder_access_list_rules(request: ReorderAccessListRequest):
    """
    Reorder rules in an access-list.
    
    This endpoint deletes all existing rules and recreates them with new numbers
    in a single VyOS commit for atomicity.
    """
    if CONFIGURED_DEVICE_NAME is None:
        raise HTTPException(status_code=503, detail="No device configured.")
    
    try:
        service = device_registry.get(CONFIGURED_DEVICE_NAME)
        version = service.get_version()
        builder = AccessListBatchBuilder(version=version)
        
        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted(
            [item.old_number for item in request.rules],
            reverse=True
        )
        
        for old_number in rules_to_delete:
            if request.list_type == "ipv4":
                builder.delete_rule(request.identifier, str(old_number))
            else:  # ipv6
                builder.delete_rule6(request.identifier, str(old_number))
        
        # Step 2: Recreate rules with new numbers
        for item in request.rules:
            rule = item.rule_data
            rule_str = str(item.new_number)
            
            if request.list_type == "ipv4":
                # Create rule
                builder.set_rule(request.identifier, rule_str)
                
                # Set action
                builder.set_rule_action(request.identifier, rule_str, rule.action)
                
                # Set description
                if rule.description:
                    builder.set_rule_description(
                        request.identifier, rule_str, rule.description
                    )
                
                # Set source
                if rule.source_type == "any":
                    builder.set_rule_source_any(request.identifier, rule_str)
                elif rule.source_type == "host" and rule.source_address:
                    builder.set_rule_source_host(
                        request.identifier, rule_str, rule.source_address
                    )
                elif rule.source_type == "inverse-mask" and rule.source_address and rule.source_mask:
                    builder.set_rule_source_inverse_mask(
                        request.identifier, rule_str, rule.source_address, rule.source_mask
                    )
                elif rule.source_type == "network" and rule.source_address and rule.source_mask:
                    builder.set_rule_source_network(
                        request.identifier, rule_str, rule.source_address, rule.source_mask
                    )
                
                # Set destination
                if rule.destination_type == "any":
                    builder.set_rule_destination_any(request.identifier, rule_str)
                elif rule.destination_type == "host" and rule.destination_address:
                    builder.set_rule_destination_host(
                        request.identifier, rule_str, rule.destination_address
                    )
                elif rule.destination_type == "inverse-mask" and rule.destination_address and rule.destination_mask:
                    builder.set_rule_destination_inverse_mask(
                        request.identifier, rule_str, rule.destination_address, rule.destination_mask
                    )
                elif rule.destination_type == "network" and rule.destination_address and rule.destination_mask:
                    builder.set_rule_destination_network(
                        request.identifier, rule_str, rule.destination_address, rule.destination_mask
                    )
            
            else:  # ipv6
                # Create rule
                builder.set_rule6(request.identifier, rule_str)
                
                # Set action
                builder.set_rule6_action(request.identifier, rule_str, rule.action)
                
                # Set description
                if rule.description:
                    builder.set_rule6_description(
                        request.identifier, rule_str, rule.description
                    )
                
                # Set source
                if rule.source_type == "any":
                    builder.set_rule6_source_any(request.identifier, rule_str)
                elif rule.source_type == "network" and rule.source_address:
                    builder.set_rule6_source_network(
                        request.identifier, rule_str, rule.source_address
                    )

                # NOTE: IPv6 access-lists do NOT have destination fields
        
        # Execute batch
        response = service.execute_batch(builder)
        
        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Rules reordered in access-list {request.identifier}"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
