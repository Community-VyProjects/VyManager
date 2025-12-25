"""
ExtExtCommunity List Router

API endpoints for managing VyOS extcommunity-list configuration.
Supports version-aware configuration for VyOS 1.4 and 1.5 (identical feature sets).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import ExtCommunityListBatchBuilder
import inspect

router = APIRouter(prefix="/vyos/extcommunity-list", tags=["extcommunity-list"])

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


class ExtCommunityListRule(BaseModel):
    """ExtExtCommunity list rule"""
    rule_number: int
    description: Optional[str] = None
    action: str = "permit"  # permit|deny
    regex: Optional[str] = None


class ExtCommunityList(BaseModel):
    """Complete extcommunity list configuration"""
    name: str
    description: Optional[str] = None
    rules: List[ExtCommunityListRule] = []


class ExtCommunityListConfig(BaseModel):
    """Response containing all extcommunity lists"""
    extcommunity_lists: List[ExtCommunityList] = []
    total: int = 0


class ExtCommunityListBatchOperation(BaseModel):
    """Single operation in a batch request"""
    op: str = Field(..., description="Operation name")
    value: Optional[str] = Field(None, description="Operation value")


class ExtCommunityListBatchRequest(BaseModel):
    """Model for batch configuration"""
    name: str = Field(..., description="ExtExtCommunity list name")
    rule_number: Optional[int] = Field(None, description="Rule number (optional)")
    operations: List[ExtCommunityListBatchOperation]


class ReorderRuleItem(BaseModel):
    """Single rule in a reorder request"""
    old_number: int = Field(..., description="Original rule number")
    new_number: int = Field(..., description="New rule number after reorder")
    rule_data: ExtCommunityListRule = Field(..., description="Complete rule configuration")


class ReorderExtCommunityListRequest(BaseModel):
    """Model for reordering extcommunity list rules"""
    extcommunity_list_name: str = Field(..., description="ExtExtCommunity list name")
    rules: List[ReorderRuleItem] = Field(..., description="List of rules with new order")


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Endpoint 1: Capabilities
# ============================================================================


@router.get("/capabilities")
async def get_extcommunity_list_capabilities(request: Request):
    """
    Get feature capabilities based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    Allows frontends to conditionally enable/disable features.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = ExtCommunityListBatchBuilder(version=version)
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


@router.get("/config", response_model=ExtCommunityListConfig)
async def get_extcommunity_list_config(http_request: Request, refresh: bool = False):
    """
    Get all extcommunity-list configuration from VyOS in a generalized format.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache.

    Returns:
        Generalized configuration data optimized for frontend consumption
    """
    try:
        service = get_session_vyos_service(request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        # Navigate to policy -> extcommunity-list
        extcommunity_list_config = full_config.get("policy", {}).get("extcommunity-list", {})

        if not extcommunity_list_config:
            return ExtCommunityListConfig(extcommunity_lists=[], total=0)

        # Parse extcommunity lists
        extcommunity_lists = []
        for name, cl_data in extcommunity_list_config.items():
            extcommunity_list = parse_extcommunity_list(name, cl_data)
            extcommunity_lists.append(extcommunity_list)

        return ExtCommunityListConfig(extcommunity_lists=extcommunity_lists, total=len(extcommunity_lists))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_extcommunity_list(name: str, cl_data: dict) -> ExtCommunityList:
    """Parse extcommunity list configuration from VyOS format."""
    description = cl_data.get("description")

    rules = []
    rules_raw = cl_data.get("rule", {})
    if rules_raw:
        for rule_num, rule_data in rules_raw.items():
            rule = parse_rule(int(rule_num), rule_data)
            rules.append(rule)

    return ExtCommunityList(
        name=name,
        description=description,
        rules=sorted(rules, key=lambda r: r.rule_number)
    )


def parse_rule(rule_number: int, rule_data: dict) -> ExtCommunityListRule:
    """Parse extcommunity list rule from VyOS format."""
    description = rule_data.get("description")
    action = rule_data.get("action", "permit")
    regex = rule_data.get("regex")

    return ExtCommunityListRule(
        rule_number=rule_number,
        description=description,
        action=action,
        regex=regex
    )


# ============================================================================
# Endpoint 3: Batch Operations
# ============================================================================


@router.post("/batch")
async def extcommunity_list_batch_configure(http_request: Request, request: ExtCommunityListBatchRequest):
    """
    Execute a batch of configuration operations.

    Allows multiple changes in a single VyOS commit for efficiency.
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = ExtCommunityListBatchBuilder(version=version)

        # Process operations using inspect for dynamic method calls
        for operation in request.operations:
            method = getattr(builder, operation.op)
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments dynamically
            args = []

            # Add extcommunity list name
            if "name" in params:
                args.append(request.name)

            # Add rule number if specified and method accepts it
            if request.rule_number and "rule" in params:
                args.append(str(request.rule_number))

            # Add operation value if provided
            if operation.value and len(params) > len(args):
                # Check remaining parameters
                remaining_params = params[len(args):]
                for param in remaining_params:
                    if param != "self":
                        args.append(operation.value)
                        break

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
async def reorder_extcommunity_list_rules(request: ReorderExtCommunityListRequest):
    """
    Reorder extcommunity list rules by deleting and recreating them in a single commit.

    This endpoint efficiently reorders multiple rules by:
    1. Deleting all specified rules in reverse order
    2. Recreating them with new rule numbers
    All operations are executed in a single VyOS commit.

    Args:
        request: Reorder request containing extcommunity list name and list of rules

    Returns:
        VyOSResponse with success/failure information
    """
    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = ExtCommunityListBatchBuilder(version=version)

        # Step 1: Delete all rules in reverse order
        rules_to_delete = sorted([r.old_number for r in request.rules], reverse=True)
        for old_number in rules_to_delete:
            builder.delete_rule(request.extcommunity_list_name, str(old_number))

        # Step 2: Recreate rules with new numbers
        for rule_item in request.rules:
            new_number = rule_item.new_number
            rule_data = rule_item.rule_data

            # Create the rule
            builder.set_rule(request.extcommunity_list_name, str(new_number))

            # Set action
            if rule_data.action:
                builder.set_rule_action(request.extcommunity_list_name, str(new_number), rule_data.action)

            # Set description
            if rule_data.description:
                builder.set_rule_description(request.extcommunity_list_name, str(new_number), rule_data.description)

            # Set regex
            if rule_data.regex:
                builder.set_rule_regex(request.extcommunity_list_name, str(new_number), rule_data.regex)

        # Execute batch
        response = service.execute_batch(builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": f"Successfully reordered {len(request.rules)} rules in extcommunity list {request.extcommunity_list_name}"},
            error=response.error if response.error else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
