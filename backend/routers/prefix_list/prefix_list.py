"""
Prefix List Router

API endpoints for managing VyOS prefix-list configuration.
Supports both IPv4 (prefix-list) and IPv6 (prefix-list6) with version-aware configuration.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import PrefixListBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/prefix-list", tags=["prefix-list"])

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


class PrefixListRule(BaseModel):
    """Model for a prefix-list rule."""
    rule_number: int
    action: str  # permit or deny
    description: Optional[str] = None
    prefix: Optional[str] = None  # CIDR notation (e.g., 10.0.0.0/8)
    ge: Optional[int] = None  # Greater-than-or-equal prefix length
    le: Optional[int] = None  # Less-than-or-equal prefix length


class PrefixList(BaseModel):
    """Model for a prefix-list."""
    name: str
    description: Optional[str] = None
    rules: List[PrefixListRule] = []
    list_type: str  # ipv4 or ipv6


class PrefixListConfigResponse(BaseModel):
    """Response containing all prefix-list configuration."""
    ipv4_lists: List[PrefixList] = []
    ipv6_lists: List[PrefixList] = []
    total_ipv4: int = 0
    total_ipv6: int = 0


class PrefixListBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class PrefixListBatchRequest(BaseModel):
    """Model for batch configuration."""
    name: str = Field(..., description="Prefix list name")
    list_type: str = Field(..., description="ipv4 or ipv6")
    rule_number: Optional[int] = Field(None, description="Rule number for rule operations")
    operations: List[PrefixListBatchOperation]


class ReorderRuleItem(BaseModel):
    """Model for a single rule in reorder request."""
    old_number: int
    new_number: int
    rule_data: PrefixListRule


class ReorderPrefixListRequest(BaseModel):
    """Model for reordering rules in a prefix-list."""
    name: str = Field(..., description="Prefix list name")
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
async def get_prefix_list_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = PrefixListBatchBuilder(version=version)
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


@router.get("/config", response_model=PrefixListConfigResponse)
async def get_prefix_list_config(http_request: Request, refresh: bool = False):
    """
    Get all prefix-list configurations from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        ipv4_lists = []
        ipv6_lists = []

        # Parse IPv4 prefix-lists
        policy_config = full_config.get("policy", {})
        prefix_lists = policy_config.get("prefix-list", {})

        for name, list_config in prefix_lists.items():
            rules = []
            rules_config = list_config.get("rule", {})

            for rule_num, rule_config in rules_config.items():
                # Parse rule data
                action = rule_config.get("action", "permit")
                description = rule_config.get("description")
                prefix = rule_config.get("prefix")

                # Parse ge (greater-than-or-equal)
                ge = None
                ge_value = rule_config.get("ge")
                if ge_value is not None:
                    try:
                        ge = int(ge_value)
                    except (ValueError, TypeError):
                        pass

                # Parse le (less-than-or-equal)
                le = None
                le_value = rule_config.get("le")
                if le_value is not None:
                    try:
                        le = int(le_value)
                    except (ValueError, TypeError):
                        pass

                rule = PrefixListRule(
                    rule_number=int(rule_num),
                    action=action,
                    description=description,
                    prefix=prefix,
                    ge=ge,
                    le=le,
                )
                rules.append(rule)

            # Sort rules by rule number
            rules.sort(key=lambda r: r.rule_number)

            prefix_list = PrefixList(
                name=name,
                description=list_config.get("description"),
                rules=rules,
                list_type="ipv4",
            )
            ipv4_lists.append(prefix_list)

        # Parse IPv6 prefix-lists
        prefix_lists6 = policy_config.get("prefix-list6", {})

        for name, list_config in prefix_lists6.items():
            rules = []
            rules_config = list_config.get("rule", {})

            for rule_num, rule_config in rules_config.items():
                # Parse rule data
                action = rule_config.get("action", "permit")
                description = rule_config.get("description")
                prefix = rule_config.get("prefix")

                # Parse ge (greater-than-or-equal)
                ge = None
                ge_value = rule_config.get("ge")
                if ge_value is not None:
                    try:
                        ge = int(ge_value)
                    except (ValueError, TypeError):
                        pass

                # Parse le (less-than-or-equal)
                le = None
                le_value = rule_config.get("le")
                if le_value is not None:
                    try:
                        le = int(le_value)
                    except (ValueError, TypeError):
                        pass

                rule = PrefixListRule(
                    rule_number=int(rule_num),
                    action=action,
                    description=description,
                    prefix=prefix,
                    ge=ge,
                    le=le,
                )
                rules.append(rule)

            # Sort rules by rule number
            rules.sort(key=lambda r: r.rule_number)

            prefix_list = PrefixList(
                name=name,
                description=list_config.get("description"),
                rules=rules,
                list_type="ipv6",
            )
            ipv6_lists.append(prefix_list)

        # Sort prefix lists by name
        ipv4_lists.sort(key=lambda pl: pl.name)
        ipv6_lists.sort(key=lambda pl: pl.name)

        return PrefixListConfigResponse(
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
async def prefix_list_batch_configure(request: PrefixListBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = PrefixListBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add name
            if "name" in params:
                args.append(request.name)

            # Add rule number if present in method signature
            if "rule" in params and request.rule_number is not None:
                args.append(str(request.rule_number))

            # Add operation value
            if operation.value and len(params) > len(args):
                args.append(operation.value)

            method(*args)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "Configuration updated"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Reorder Endpoint
# ============================================================================


@router.post("/reorder")
async def reorder_prefix_list_rules(request: ReorderPrefixListRequest):
    """
    Reorder rules in a prefix-list.

    This endpoint deletes all existing rules and recreates them with new numbers
    in a single VyOS commit for atomicity.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = PrefixListBatchBuilder(version=version)

        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted(
            [item.old_number for item in request.rules],
            reverse=True
        )

        for old_number in rules_to_delete:
            if request.list_type == "ipv4":
                builder.delete_rule(request.name, str(old_number))
            else:  # ipv6
                builder.delete_rule6(request.name, str(old_number))

        # Step 2: Recreate rules with new numbers
        for item in request.rules:
            rule = item.rule_data
            rule_str = str(item.new_number)

            if request.list_type == "ipv4":
                # Create rule
                builder.set_rule(request.name, rule_str)

                # Set action
                builder.set_rule_action(request.name, rule_str, rule.action)

                # Set description
                if rule.description:
                    builder.set_rule_description(
                        request.name, rule_str, rule.description
                    )

                # Set prefix
                if rule.prefix:
                    builder.set_rule_prefix(request.name, rule_str, rule.prefix)

                # Set ge
                if rule.ge is not None:
                    builder.set_rule_ge(request.name, rule_str, str(rule.ge))

                # Set le
                if rule.le is not None:
                    builder.set_rule_le(request.name, rule_str, str(rule.le))

            else:  # ipv6
                # Create rule
                builder.set_rule6(request.name, rule_str)

                # Set action
                builder.set_rule6_action(request.name, rule_str, rule.action)

                # Set description
                if rule.description:
                    builder.set_rule6_description(
                        request.name, rule_str, rule.description
                    )

                # Set prefix
                if rule.prefix:
                    builder.set_rule6_prefix(request.name, rule_str, rule.prefix)

                # Set ge
                if rule.ge is not None:
                    builder.set_rule6_ge(request.name, rule_str, str(rule.ge))

                # Set le
                if rule.le is not None:
                    builder.set_rule6_le(request.name, rule_str, str(rule.le))

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Rules reordered in prefix-list {request.name}"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
